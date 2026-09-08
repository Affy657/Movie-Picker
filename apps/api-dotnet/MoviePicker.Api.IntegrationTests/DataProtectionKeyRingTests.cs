using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class DataProtectionKeyRingTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public DataProtectionKeyRingTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private MongoXmlRepository CreateRepository() =>
        new(_factory.Services.GetRequiredService<MongoCollectionFactory>());

    private static XElement Key(string id) =>
        new("key",
            new XAttribute("id", id),
            new XElement("creationDate", "2026-01-01T00:00:00Z"));

    [MongoFact]
    public void StoredKey_IsReadBackIdentically()
    {
        var repository = CreateRepository();
        var friendlyName = "key-" + Guid.NewGuid().ToString("N");
        var element = Key(friendlyName);

        repository.StoreElement(element, friendlyName);

        var stored = Assert.Single(
            repository.GetAllElements(),
            e => (string?)e.Attribute("id") == friendlyName);
        Assert.Equal(element.ToString(SaveOptions.DisableFormatting), stored.ToString(SaveOptions.DisableFormatting));
    }

    [MongoFact]
    public void SecondInstanceStartingCold_SeesTheKeysWrittenByTheFirst()
    {
        var friendlyName = "key-" + Guid.NewGuid().ToString("N");
        CreateRepository().StoreElement(Key(friendlyName), friendlyName);

        var otherInstance = CreateRepository();

        Assert.Contains(
            otherInstance.GetAllElements(),
            e => (string?)e.Attribute("id") == friendlyName);
    }

    [MongoFact]
    public void StoringTheSameFriendlyNameTwice_ReplacesInsteadOfDuplicating()
    {
        var repository = CreateRepository();
        var friendlyName = "key-" + Guid.NewGuid().ToString("N");

        repository.StoreElement(Key(friendlyName), friendlyName);
        var updated = Key(friendlyName);
        updated.Add(new XElement("activationDate", "2026-02-01T00:00:00Z"));
        repository.StoreElement(updated, friendlyName);

        var matching = repository.GetAllElements()
            .Where(e => (string?)e.Attribute("id") == friendlyName)
            .ToList();

        Assert.Single(matching);
        Assert.NotNull(matching[0].Element("activationDate"));
    }

    [MongoFact]
    public void StoringWithoutAFriendlyName_KeepsEveryKey()
    {
        var repository = CreateRepository();
        var before = repository.GetAllElements().Count;

        repository.StoreElement(Key("anonyme-1"), string.Empty);
        repository.StoreElement(Key("anonyme-2"), string.Empty);

        Assert.Equal(before + 2, repository.GetAllElements().Count);
    }

    [MongoFact]
    public void DataProtectionOfTheHost_UsesTheMongoBackedKeyRing()
    {
        var options = _factory.Services.GetRequiredService<IOptions<KeyManagementOptions>>().Value;

        Assert.IsType<MongoXmlRepository>(options.XmlRepository);
    }

    [MongoFact]
    public void PayloadProtectedByOneInstance_IsUnprotectedByAnother()
    {
        var repository = CreateRepository();

        var first = BuildProtector(repository);
        var protectedPayload = first.Protect("cookie-de-session");

        var second = BuildProtector(repository);

        Assert.Equal("cookie-de-session", second.Unprotect(protectedPayload));
    }

    private static IDataProtector BuildProtector(MongoXmlRepository keyRing)
    {
        var services = new ServiceCollection();
        services.AddDataProtection().SetApplicationName("MoviePicker");
        services.Configure<KeyManagementOptions>(options => options.XmlRepository = keyRing);

        var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IDataProtectionProvider>().CreateProtector("auth-cookie");
    }
}

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Moq;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class DataProtectionConfigurationTests
{
    private static readonly string KeyRingDirectory =
        Path.Combine(Path.GetTempPath(), "moviepicker-dp-keys");

    private const string SampleKeyRing =
        """<key id="3b1f5a2c-0000-4000-8000-000000000001" version="1"><creationDate>2026-01-01T00:00:00Z</creationDate></key>""";

    private static WebApplicationBuilder BuildWith(Dictionary<string, string?> settings)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Configuration.AddInMemoryCollection(settings);
        return builder;
    }

    private static MongoCollectionFactory FakeCollectionFactory()
    {
        var database = new Mock<IMongoDatabase>();
        database
            .Setup(d => d.GetCollection<DataProtectionKeyDocument>(
                It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Returns(new Mock<IMongoCollection<DataProtectionKeyDocument>>().Object);
        return new MongoCollectionFactory(database.Object, new MongoSessionAccessor());
    }

    private static KeyManagementOptions ResolveKeyManagementOptions(IServiceProvider services)
    {
        var options = new KeyManagementOptions();
        foreach (var configure in services.GetServices<IConfigureOptions<KeyManagementOptions>>())
            configure.Configure(options);
        return options;
    }

    [Fact]
    public void AddSharedDataProtection_PinsTheApplicationDiscriminatorSoInstancesShareTheKeyRing()
    {
        var builder = BuildWith([]);

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<DataProtectionOptions>>().Value;

        Assert.Equal(DataProtectionConfiguration.ApplicationName, options.ApplicationDiscriminator);
    }

    [Fact]
    public void AddSharedDataProtection_MongoConfigured_PersistsTheKeyRingInMongo()
    {
        var builder = BuildWith(new Dictionary<string, string?>
        {
            ["MONGODB_URI"] = "mongodb://127.0.0.1:27017/moviepicker_test"
        });
        builder.Services.AddSingleton(FakeCollectionFactory());

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        var options = ResolveKeyManagementOptions(provider);

        Assert.IsType<MongoXmlRepository>(options.XmlRepository);
    }

    [Fact]
    public void AddSharedDataProtection_MongoConfiguredButFactoryMissing_LeavesTheKeyRingAlone()
    {
        var builder = BuildWith(new Dictionary<string, string?>
        {
            ["MONGODB_URI"] = "mongodb://127.0.0.1:27017/moviepicker_test"
        });

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        var options = ResolveKeyManagementOptions(provider);

        Assert.Null(options.XmlRepository);
    }

    [Fact]
    public void AddSharedDataProtection_MongoConfigured_IgnoresTheEnvironmentKeyRing()
    {
        var builder = BuildWith(new Dictionary<string, string?>
        {
            ["MONGODB_URI"] = "mongodb://127.0.0.1:27017/moviepicker_test",
            [DataProtectionConfiguration.KeyRingXmlEnvName] = SampleKeyRing
        });
        builder.Services.AddSingleton(FakeCollectionFactory());

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        Assert.IsType<MongoXmlRepository>(ResolveKeyManagementOptions(provider).XmlRepository);
    }

    [Fact]
    public void AddSharedDataProtection_NoMongoNoKeyRing_RegistersNoRepository()
    {
        var builder = BuildWith([]);

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        Assert.Null(ResolveKeyManagementOptions(provider).XmlRepository);
    }

    [Fact]
    public void AddSharedDataProtection_KeyRingFromConfiguration_WritesItToDiskAndKeepsASingleFile()
    {
        Directory.CreateDirectory(KeyRingDirectory);
        var stale = Path.Combine(KeyRingDirectory, "stale.xml");
        File.WriteAllText(stale, "<key id=\"périmée\" />");

        var builder = BuildWith(new Dictionary<string, string?>
        {
            [DataProtectionConfiguration.KeyRingXmlEnvName] = "  " + SampleKeyRing + "  "
        });

        builder.AddSharedDataProtection();

        var files = Directory.GetFiles(KeyRingDirectory, "*.xml");
        Assert.Single(files);
        Assert.False(File.Exists(stale));
        Assert.Equal(SampleKeyRing, File.ReadAllText(files[0]));
    }

    [Fact]
    public void AddSharedDataProtection_BlankKeyRing_WritesNothing()
    {
        Directory.CreateDirectory(KeyRingDirectory);
        foreach (var existing in Directory.EnumerateFiles(KeyRingDirectory, "*.xml"))
            File.Delete(existing);

        var builder = BuildWith(new Dictionary<string, string?>
        {
            [DataProtectionConfiguration.KeyRingXmlEnvName] = "   "
        });

        builder.AddSharedDataProtection();

        Assert.Empty(Directory.GetFiles(KeyRingDirectory, "*.xml"));
    }
}

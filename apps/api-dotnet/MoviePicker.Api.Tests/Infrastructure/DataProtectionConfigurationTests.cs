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
    public void AddSharedDataProtection_NoMongo_RegistersNoRepository()
    {
        var builder = BuildWith([]);

        builder.AddSharedDataProtection();

        using var provider = builder.Services.BuildServiceProvider();
        Assert.Null(ResolveKeyManagementOptions(provider).XmlRepository);
    }
}

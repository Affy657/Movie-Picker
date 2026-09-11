using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Infrastructure;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class MongoDatabaseGuardTests
{
    private const string ProdCluster = "mongodb+srv://user:pwd@cluster0.example.mongodb.net";

    private static IServiceCollection AddWith(string environment, string? mongoUri, bool testContext = false)
    {
        var services = new ServiceCollection();
        var settings = new Dictionary<string, string?> { ["MONGODB_URI"] = mongoUri };
        if (testContext)
            settings["MOVIEPICKER_TEST_CONTEXT"] = "1";
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var env = new TestHostEnv { EnvironmentName = environment };
        return services.AddMoviePicker(cfg, env);
    }

    [Fact]
    public void Development_targeting_prod_database_throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => AddWith(Environments.Development, $"{ProdCluster}/moviepicker"));
        Assert.Contains("moviepicker_dev", ex.Message);
    }

    [Fact]
    public void Development_targeting_dedicated_database_is_allowed()
    {
        var record = Record.Exception(
            () => AddWith(Environments.Development, $"{ProdCluster}/moviepicker_dev"));
        Assert.Null(record);
    }

    [Fact]
    public void Production_targeting_prod_database_is_allowed()
    {
        var record = Record.Exception(
            () => AddWith(Environments.Production, $"{ProdCluster}/moviepicker"));
        Assert.Null(record);
    }

    [Fact]
    public void Development_without_mongo_uri_is_allowed()
    {
        var record = Record.Exception(() => AddWith(Environments.Development, ""));
        Assert.Null(record);
    }

    [Fact]
    public void TestContext_targeting_shared_development_database_throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => AddWith(Environments.Development, $"{ProdCluster}/moviepicker_dev", testContext: true));
        Assert.Contains("moviepicker_dev", ex.Message);
    }

    [Fact]
    public void TestContext_targeting_prod_database_throws()
    {
        Assert.Throws<InvalidOperationException>(
            () => AddWith(Environments.Development, $"{ProdCluster}/moviepicker", testContext: true));
    }

    [Fact]
    public void TestContext_targeting_isolated_database_is_allowed()
    {
        var record = Record.Exception(
            () => AddWith(Environments.Development, $"{ProdCluster}/moviepicker_it_abc123", testContext: true));
        Assert.Null(record);
    }

    [Fact]
    public void TestContext_without_mongo_uri_is_allowed()
    {
        var record = Record.Exception(() => AddWith(Environments.Development, "", testContext: true));
        Assert.Null(record);
    }

    private sealed class TestHostEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

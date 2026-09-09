using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class TestDatabaseIsolationTests
{
    private static readonly string[] SharedDatabaseNames = ["moviepicker", "moviepicker_dev"];

    [Fact]
    public void TestAssembly_declares_the_test_context()
    {
        Assert.True(EnvLoader.IsTestContext);
    }

    [Fact]
    public void Booting_the_api_never_resolves_a_shared_database()
    {
        using var factory = new MoviePickerApplicationFactory();
        using var client = factory.CreateClient();

        var database = factory.Services.GetService<IMongoDatabase>();

        if (database is null)
        {
            Assert.False(factory.RunsAgainstMongo);
            return;
        }

        Assert.DoesNotContain(
            database.DatabaseNamespace.DatabaseName,
            SharedDatabaseNames,
            StringComparer.OrdinalIgnoreCase);
        Assert.StartsWith("moviepicker_it_", database.DatabaseNamespace.DatabaseName);
    }
}

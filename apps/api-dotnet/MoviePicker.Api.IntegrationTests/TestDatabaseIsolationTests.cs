using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
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

    [MongoFact]
    public async Task Booting_the_api_applies_every_data_migration_before_a_test_writes()
    {
        using var factory = new MoviePickerApplicationFactory();
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var history = scope.ServiceProvider.GetRequiredService<IMigrationHistoryRepository>();

        var pending = new List<string>();
        foreach (var migration in scope.ServiceProvider.GetServices<IDataMigration>().Where(m => m is not IRepeatableDataMigration))
        {
            if (!await history.IsAppliedAsync(migration.Id))
                pending.Add(migration.Id);
        }

        Assert.Empty(pending);
    }
}

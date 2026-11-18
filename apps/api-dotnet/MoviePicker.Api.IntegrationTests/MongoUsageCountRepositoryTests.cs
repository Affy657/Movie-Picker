using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoUsageCountRepositoryTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const int ParallelHits = 50;

    private readonly MoviePickerApplicationFactory _factory;

    public MongoUsageCountRepositoryTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private async Task IncrementAsync(DateOnly day, UsageCount count)
    {
        using var scope = _factory.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IUsageCountRepository>();
        await repository.IncrementAsync(day, count);
    }

    private async Task<List<UsageCountDocument>> ReadDayAsync(DateOnly day)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var dayText = day.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        return await database
            .GetCollection<UsageCountDocument>("usage_counts")
            .Find(document => document.Day == dayText)
            .ToListAsync();
    }

    [MongoFact]
    public void ProductionRepository_IsTheMongoBackedOne()
    {
        using var scope = _factory.Services.CreateScope();
        Assert.IsType<MongoUsageCountRepository>(
            scope.ServiceProvider.GetRequiredService<IUsageCountRepository>());
    }

    [MongoFact]
    public async Task ConcurrentIncrements_LandInASingleDocumentPerDayMetricAndVariant()
    {
        var day = new DateOnly(2001, 1, 1).AddDays(Random.Shared.Next(0, 3000));

        await Task.WhenAll(Enumerable.Range(0, ParallelHits)
            .Select(_ => IncrementAsync(day, UsageCount.LetterboxdSynced(forced: false))));
        await IncrementAsync(day, UsageCount.LetterboxdSynced(forced: true));

        var stored = await ReadDayAsync(day);
        var automatic = Assert.Single(stored, document => document.Variant == "auto");
        Assert.Equal(UsageCount.LetterboxdSyncedMetric, automatic.Metric);
        Assert.Equal(ParallelHits, automatic.Count);
        var manual = Assert.Single(stored, document => document.Variant == "manual");
        Assert.Equal(1, manual.Count);
        Assert.Equal(2, stored.Count);
    }

    [MongoFact]
    public async Task StoredDocument_CarriesNoIdentifierOfAPersonOrAnEvent()
    {
        var day = new DateOnly(2001, 1, 1).AddDays(Random.Shared.Next(3000, 6000));

        await IncrementAsync(day, UsageCount.EventJoined(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow));

        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var dayText = day.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var raw = await database.GetCollection<MongoDB.Bson.BsonDocument>("usage_counts")
            .Find(new MongoDB.Bson.BsonDocument("day", dayText))
            .SingleAsync();
        Assert.Equal(
            ["_id", "count", "day", "metric", "variant"],
            raw.Names.OrderBy(name => name, StringComparer.Ordinal));
    }
}

using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoRateLimitCounterStoreTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const int ParallelHits = 50;

    private readonly MoviePickerApplicationFactory _factory;

    public MongoRateLimitCounterStoreTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private async Task<long> IncrementAsync(string key, DateTimeOffset expiresAt)
    {
        using var scope = _factory.Services.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<IRateLimitCounterStore>();
        return await store.IncrementAsync(key, expiresAt);
    }

    private async Task<RateLimitCounterDocument?> ReadAsync(string key)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        return await database
            .GetCollection<RateLimitCounterDocument>("rate_limit_counters")
            .Find(counter => counter.Id == key)
            .FirstOrDefaultAsync();
    }

    [MongoFact]
    public void ProductionStore_IsTheMongoBackedOne()
    {
        using var scope = _factory.Services.CreateScope();
        Assert.IsType<MongoRateLimitCounterStore>(
            scope.ServiceProvider.GetRequiredService<IRateLimitCounterStore>());
    }

    [MongoFact]
    public async Task ConcurrentIncrements_CountEveryHitExactlyOnce()
    {
        var key = "concurrent:" + Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(1);

        var counts = await Task.WhenAll(
            Enumerable.Range(0, ParallelHits).Select(_ => IncrementAsync(key, expiresAt)));

        Assert.Equal(
            Enumerable.Range(1, ParallelHits).Select(value => (long)value).ToArray(),
            counts.OrderBy(count => count).ToArray());

        var stored = await ReadAsync(key);
        Assert.NotNull(stored);
        Assert.Equal(ParallelHits, stored!.Count);
    }

    [MongoFact]
    public async Task FirstIncrement_StampsTheExpiryUsedByTheTtlIndex()
    {
        var key = "expiry:" + Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(5);

        Assert.Equal(1, await IncrementAsync(key, expiresAt));

        var stored = await ReadAsync(key);
        Assert.NotNull(stored);
        Assert.Equal(expiresAt.UtcDateTime, stored!.ExpiresAt, TimeSpan.FromMilliseconds(1));
    }

    [MongoFact]
    public async Task LaterIncrements_NeverPushTheExpiryBack()
    {
        var key = "window:" + Guid.NewGuid().ToString("N");
        var openedAt = DateTimeOffset.UtcNow.AddMinutes(1);

        await IncrementAsync(key, openedAt);
        await IncrementAsync(key, openedAt.AddMinutes(30));

        var stored = await ReadAsync(key);
        Assert.NotNull(stored);
        Assert.Equal(openedAt.UtcDateTime, stored!.ExpiresAt, TimeSpan.FromMilliseconds(1));
    }
}

using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoSharedCacheTests : IClassFixture<MoviePickerApplicationFactory>
{
    private sealed record Snapshot(string Title, int Runtime);

    private readonly MoviePickerApplicationFactory _factory;

    public MongoSharedCacheTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private ISharedCache Cache() => _factory.Services.GetRequiredService<ISharedCache>();

    private async Task<SharedCacheDocument?> ReadAsync(string key)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        return await database
            .GetCollection<SharedCacheDocument>(MongoSharedCache.CollectionName)
            .Find(entry => entry.Id == key)
            .FirstOrDefaultAsync();
    }

    [MongoFact]
    public void ProductionCache_IsTheMongoBackedOne()
    {
        Assert.IsType<MongoSharedCache>(Cache());
    }

    [MongoFact]
    public async Task SetAsync_ThenTryGet_RoundTripsThroughJson()
    {
        var key = "snapshot:" + Guid.NewGuid().ToString("N");

        await Cache().SetAsync(key, new List<Snapshot> { new("Heat", 170) }, TimeSpan.FromMinutes(5));
        var entry = await Cache().TryGetAsync<IReadOnlyList<Snapshot>>(key);

        Assert.Equal(new Snapshot("Heat", 170), Assert.Single(entry!.Value));
        Assert.InRange(entry.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(4), DateTimeOffset.UtcNow.AddMinutes(6));
    }

    [MongoFact]
    public async Task SetAsync_Twice_ReplacesTheEntry()
    {
        var key = "snapshot:" + Guid.NewGuid().ToString("N");

        await Cache().SetAsync(key, "first", TimeSpan.FromMinutes(5));
        await Cache().SetAsync(key, "second", TimeSpan.FromMinutes(5));

        Assert.Equal("second", (await Cache().TryGetAsync<string>(key))?.Value);
        Assert.NotNull(await ReadAsync(key));
    }

    [MongoFact]
    public async Task TryGetAsync_ExpiredEntry_ReturnsNullBeforeMongoReapsIt()
    {
        var key = "snapshot:" + Guid.NewGuid().ToString("N");

        await Cache().SetAsync(key, "stale", TimeSpan.FromSeconds(-1));

        Assert.Null(await Cache().TryGetAsync<string>(key));
        Assert.NotNull(await ReadAsync(key));
    }

    [MongoFact]
    public async Task TryGetAsync_UnknownKey_ReturnsNull()
    {
        Assert.Null(await Cache().TryGetAsync<string>("snapshot:" + Guid.NewGuid().ToString("N")));
    }
}

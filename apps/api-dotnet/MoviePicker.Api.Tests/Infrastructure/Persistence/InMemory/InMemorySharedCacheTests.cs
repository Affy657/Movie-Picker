using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemorySharedCacheTests
{
    [Fact]
    public async Task TryGetAsync_UnknownKey_ReturnsNull()
    {
        var sut = new InMemorySharedCache();

        Assert.Null(await sut.TryGetAsync<string>("missing"));
    }

    [Fact]
    public async Task SetAsync_ThenTryGet_ReturnsValueWithItsExpiry()
    {
        var sut = new InMemorySharedCache();
        var before = DateTimeOffset.UtcNow;

        await sut.SetAsync("k", "v", TimeSpan.FromMinutes(5));
        var entry = await sut.TryGetAsync<string>("k");

        Assert.Equal("v", entry?.Value);
        Assert.InRange(entry!.ExpiresAt, before.AddMinutes(5), DateTimeOffset.UtcNow.AddMinutes(5));
    }

    [Fact]
    public async Task TryGetAsync_ExpiredEntry_ReturnsNull()
    {
        var sut = new InMemorySharedCache();

        await sut.SetAsync("k", "v", TimeSpan.FromMilliseconds(-1));

        Assert.Null(await sut.TryGetAsync<string>("k"));
    }

    [Fact]
    public async Task TryGetAsync_TypeMismatch_ReturnsNull()
    {
        var sut = new InMemorySharedCache();

        await sut.SetAsync("k", 42, TimeSpan.FromMinutes(1));

        Assert.Null(await sut.TryGetAsync<string>("k"));
    }
}

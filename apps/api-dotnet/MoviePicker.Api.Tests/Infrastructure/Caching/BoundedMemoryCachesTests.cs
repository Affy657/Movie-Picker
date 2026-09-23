using Microsoft.Extensions.Caching.Memory;
using MoviePicker.Api.Infrastructure.Caching;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Caching;

public sealed class BoundedMemoryCachesTests
{
    [Fact]
    public void TmdbEntryCache_RefusesAnEntryPastItsCapacity()
    {
        using var cache = new TmdbEntryCache();
        for (var i = 0; i < TmdbEntryCache.MaxEntries; i++)
            cache.Set(i, i, new MemoryCacheEntryOptions { Size = 1 });

        cache.Set("one-too-many", 1, new MemoryCacheEntryOptions { Size = 1 });

        Assert.False(cache.TryGetValue("one-too-many", out _));
    }

    [Fact]
    public void CatalogEntryCache_RefusesAnEntryPastItsCapacity()
    {
        using var cache = new CatalogEntryCache();
        for (var i = 0; i < CatalogEntryCache.MaxEntries; i++)
            cache.Set(i, i, new MemoryCacheEntryOptions { Size = 1 });

        cache.Set("one-too-many", 1, new MemoryCacheEntryOptions { Size = 1 });

        Assert.False(cache.TryGetValue("one-too-many", out _));
    }

    [Fact]
    public void BoundedCaches_RefuseAnEntryThatDoesNotDeclareItsSize()
    {
        using var tmdb = new TmdbEntryCache();
        using var catalog = new CatalogEntryCache();

        Assert.Throws<InvalidOperationException>(() => tmdb.Set("k", "v"));
        Assert.Throws<InvalidOperationException>(() => catalog.Set("k", "v"));
    }
}

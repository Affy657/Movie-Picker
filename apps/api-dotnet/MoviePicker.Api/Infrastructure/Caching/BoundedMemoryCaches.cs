using Microsoft.Extensions.Caching.Memory;

namespace MoviePicker.Api.Infrastructure.Caching;

public sealed class TmdbEntryCache() : MemoryCache(new MemoryCacheOptions { SizeLimit = MaxEntries })
{
    public const int MaxEntries = 10_000;
}

public sealed class CatalogEntryCache() : MemoryCache(new MemoryCacheOptions { SizeLimit = MaxEntries })
{
    public const int MaxEntries = 500;
}

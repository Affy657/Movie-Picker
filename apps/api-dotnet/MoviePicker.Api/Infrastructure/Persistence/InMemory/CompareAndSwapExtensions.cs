using System.Collections.Concurrent;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public static class CompareAndSwapExtensions
{
    public static TValue? SwapIfPresent<TKey, TValue>(
        this ConcurrentDictionary<TKey, TValue> store,
        TKey key,
        Func<TValue, TValue?> change)
        where TKey : notnull
        where TValue : class
    {
        while (store.TryGetValue(key, out var current))
        {
            var next = change(current);
            if (next is null)
                return null;
            if (store.TryUpdate(key, next, current))
                return next;
        }

        return null;
    }
}

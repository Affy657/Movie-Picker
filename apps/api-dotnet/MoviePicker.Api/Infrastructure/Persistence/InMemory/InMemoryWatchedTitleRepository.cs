using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryWatchedTitleRepository : IWatchedTitleRepository
{
    private readonly Dictionary<(string OwnerId, int TmdbId, MovieMediaType MediaType), WatchedTitle> _store = [];
    private readonly Lock _gate = new();

    public Task<IReadOnlyList<WatchedTitle>> ListByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<WatchedTitle> titles =
            [
                .. _store.Values
                    .Where(title => title.OwnerId == ownerId)
                    .OrderByDescending(title => title.WatchedAt)
            ];
            return Task.FromResult(titles);
        }
    }

    public Task<IReadOnlyList<MovieListTitle>> ListTitlesByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<MovieListTitle> titles =
            [
                .. _store.Values
                    .Where(title => title.OwnerId == ownerId)
                    .Select(title => new MovieListTitle(title.TmdbId, title.MediaType))
            ];
            return Task.FromResult(titles);
        }
    }

    public Task<WatchedTitle?> GetAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.GetValueOrDefault((ownerId, tmdbId, mediaType)));
    }

    public Task<WatchedTitle> AddIfAbsentAsync(WatchedTitle title, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var key = (title.OwnerId, title.TmdbId, title.MediaType);
            if (_store.TryGetValue(key, out var existing))
                return Task.FromResult(existing);

            var stored = title with { Id = Guid.NewGuid().ToString("N"), GenreIds = [.. title.GenreIds] };
            _store[key] = stored;
            return Task.FromResult(stored);
        }
    }

    public Task<WatchedTitle?> SetRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            var key = (ownerId, tmdbId, mediaType);
            if (!_store.TryGetValue(key, out var existing))
                return Task.FromResult<WatchedTitle?>(null);

            var updated = Rated(existing, rating, WatchedOrigin.Manual, updatedAt);
            _store[key] = updated;
            return Task.FromResult<WatchedTitle?>(updated);
        }
    }

    public Task<bool> ApplyLetterboxdRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default) =>
        Task.FromResult(Replace(ownerId, tmdbId, mediaType, title => title.LetterboxdMayRate
            ? Rated(title, rating, WatchedOrigin.Letterboxd, updatedAt)
            : null));

    public Task<bool> LinkLetterboxdAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        string slug,
        CancellationToken ct = default) =>
        Task.FromResult(Replace(ownerId, tmdbId, mediaType, title => title with { LetterboxdSlug = slug }));

    public Task<long> RemoveFromLetterboxdAsync(string ownerId, IReadOnlyCollection<string> ids, CancellationToken ct = default)
    {
        var targets = ids.ToHashSet(StringComparer.Ordinal);
        lock (_gate)
        {
            var departed = _store
                .Where(pair => pair.Value.OwnerId == ownerId
                    && pair.Value.Origin == WatchedOrigin.Letterboxd
                    && targets.Contains(pair.Value.Id))
                .Select(pair => pair.Key)
                .ToList();
            departed.ForEach(key => _store.Remove(key));
            return Task.FromResult((long)departed.Count);
        }
    }

    public Task<long> CountFromLetterboxdAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.Values.LongCount(title => title.OwnerId == ownerId && title.Origin == WatchedOrigin.Letterboxd));
    }

    private static WatchedTitle Rated(WatchedTitle title, int? rating, WatchedOrigin origin, DateTimeOffset updatedAt) =>
        title with
        {
            Rating = rating,
            RatingOrigin = rating is null ? null : origin,
            UpdatedAt = updatedAt
        };

    private bool Replace(string ownerId, int tmdbId, MovieMediaType mediaType, Func<WatchedTitle, WatchedTitle?> change)
    {
        lock (_gate)
        {
            var key = (ownerId, tmdbId, mediaType);
            if (!_store.TryGetValue(key, out var existing) || change(existing) is not { } updated)
                return false;

            _store[key] = updated;
            return true;
        }
    }

    public Task<bool> RemoveAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.Remove((ownerId, tmdbId, mediaType)));
    }

    public Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var owned = _store.Keys.Where(key => key.OwnerId == ownerId).ToList();
            owned.ForEach(key => _store.Remove(key));
            return Task.FromResult((long)owned.Count);
        }
    }
}

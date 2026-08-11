using System.Collections.Concurrent;
using System.Linq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieRepository : IMovieRepository
{
    private readonly ConcurrentDictionary<string, Movie> _byId = new();
    private readonly ConcurrentDictionary<string, List<Movie>> _byEventId = new();

    public Task<Movie?> GetByIdAsync(string movieId, CancellationToken ct = default) =>
        Task.FromResult(_byId.TryGetValue(movieId, out var m) ? m : null);

    public Task<Movie?> GetByIdAndEventIdAsync(string movieId, string eventId, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(movieId, out var m) && m.EventId == eventId)
            return Task.FromResult<Movie?>(m);
        return Task.FromResult<Movie?>(null);
    }

    public Task<IReadOnlyList<Movie>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => []);
        lock (list) { return Task.FromResult<IReadOnlyList<Movie>>(list.ToList()); }
    }

    public Task<bool> ExistsByEventAndTmdbIdAsync(
        string eventId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => []);
        lock (list)
        {
            return Task.FromResult(list.Any(m => m.TmdbId == tmdbId && m.MediaType == mediaType));
        }
    }

    public Task<bool> ExistsByEventAndTitleCaseInsensitiveAsync(string eventId, string title, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => []);
        var t = title.Trim();
        lock (list) { return Task.FromResult(list.Any(m => string.Equals(m.Title, t, StringComparison.OrdinalIgnoreCase))); }
    }

    public Task<int> CountByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => []);
        lock (list)
        {
            var n = list.Count(m => m.ParticipantId == participantId);
            return Task.FromResult(n);
        }
    }

    public Task<Movie> InsertAsync(Movie movie, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(movie.Id) ? Guid.NewGuid().ToString("N")[..24] : movie.Id;
        var created = movie with { Id = id };
        _byId[id] = created;
        var list = _byEventId.GetOrAdd(created.EventId, _ => []);
        lock (list) { list.Add(created); }
        return Task.FromResult(created);
    }

    public Task DeleteAsync(string movieId, CancellationToken ct = default)
    {
        if (_byId.TryRemove(movieId, out var m) && _byEventId.TryGetValue(m.EventId, out var list))
        {
            lock (list) { list.RemoveAll(x => x.Id == movieId); }
        }
        return Task.CompletedTask;
    }

    public Task UpdatePitchNoteAsync(string movieId, string? pitchNote, CancellationToken ct = default)
    {
        if (!_byId.TryGetValue(movieId, out var existing))
            return Task.CompletedTask;

        var updated = existing with { PitchNote = pitchNote, UpdatedAt = DateTimeOffset.UtcNow };
        _byId[movieId] = updated;

        if (_byEventId.TryGetValue(existing.EventId, out var list))
        {
            lock (list)
            {
                var idx = list.FindIndex(m => m.Id == movieId);
                if (idx >= 0) list[idx] = updated;
            }
        }

        return Task.CompletedTask;
    }

    public Task UpdateWheelExclusionAsync(string movieId, bool excluded, CancellationToken ct = default)
    {
        if (!_byId.TryGetValue(movieId, out var existing))
            return Task.CompletedTask;

        var updated = existing with { ExcludedFromWheel = excluded, UpdatedAt = DateTimeOffset.UtcNow };
        _byId[movieId] = updated;

        if (_byEventId.TryGetValue(existing.EventId, out var list))
        {
            lock (list)
            {
                var idx = list.FindIndex(m => m.Id == movieId);
                if (idx >= 0) list[idx] = updated;
            }
        }

        return Task.CompletedTask;
    }

    public Task UpdateGenresAsync(string movieId, IReadOnlyList<int> genreIds, CancellationToken ct = default)
    {
        if (!_byId.TryGetValue(movieId, out var existing))
            return Task.CompletedTask;

        var updated = existing with { GenreIds = genreIds.ToList(), UpdatedAt = DateTimeOffset.UtcNow };
        _byId[movieId] = updated;

        if (_byEventId.TryGetValue(existing.EventId, out var list))
        {
            lock (list)
            {
                var idx = list.FindIndex(m => m.Id == movieId);
                if (idx >= 0) list[idx] = updated;
            }
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Movie>> ListByParticipantIdsAsync(
        IReadOnlyCollection<string> participantIds,
        CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        var set = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet();
        if (set.Count == 0)
            return Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        var list = _byId.Values.Where(m => set.Contains(m.ParticipantId)).ToList();
        return Task.FromResult<IReadOnlyList<Movie>>(list);
    }

    public Task<IReadOnlyList<Movie>> ListMissingGenresAsync(int limit, CancellationToken ct = default)
    {
        if (limit <= 0)
            return Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        var list = _byId.Values.Where(m => m.GenreIds.Count == 0).Take(limit).ToList();
        return Task.FromResult<IReadOnlyList<Movie>>(list);
    }

    public Task<IReadOnlyList<string>> ListIdsByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => []);
        lock (list)
        {
            var ids = list
                .Where(m => m.ParticipantId == participantId)
                .Select(m => m.Id)
                .ToList();
            return Task.FromResult<IReadOnlyList<string>>(ids);
        }
    }

    public Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (!_byEventId.TryGetValue(eventId, out var list))
            return Task.FromResult(0);
        lock (list) { return Task.FromResult(list.Count); }
    }

    public Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(
        IReadOnlyCollection<string> eventIds,
        CancellationToken ct = default)
    {
        var map = eventIds.Distinct().ToDictionary(id => id, _ => 0);
        foreach (var id in map.Keys.ToList())
        {
            if (_byEventId.TryGetValue(id, out var list))
            {
                lock (list) { map[id] = list.Count; }
            }
        }

        return Task.FromResult<IReadOnlyDictionary<string, int>>(map);
    }

    public Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(0L);

        long count = 0;
        if (_byEventId.TryRemove(eventId, out var list))
        {
            lock (list)
            {
                count = list.Count;
                foreach (var m in list)
                    _byId.TryRemove(m.Id, out _);
            }
        }

        return Task.FromResult(count);
    }
}

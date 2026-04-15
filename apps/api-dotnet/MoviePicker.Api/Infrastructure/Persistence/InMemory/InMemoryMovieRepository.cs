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
        var list = _byEventId.GetOrAdd(eventId, _ => new List<Movie>());
        lock (list) { return Task.FromResult<IReadOnlyList<Movie>>(list.ToList()); }
    }

    public Task<bool> ExistsByEventAndTmdbIdAsync(string eventId, int tmdbId, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => new List<Movie>());
        lock (list) { return Task.FromResult(list.Any(m => m.TmdbId == tmdbId)); }
    }

    public Task<bool> ExistsByEventAndTitleCaseInsensitiveAsync(string eventId, string title, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => new List<Movie>());
        var t = title.Trim();
        lock (list) { return Task.FromResult(list.Any(m => string.Equals(m.Title, t, StringComparison.OrdinalIgnoreCase))); }
    }

    public Task<int> CountByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        var list = _byEventId.GetOrAdd(eventId, _ => new List<Movie>());
        lock (list)
        {
            var n = list.Count(m => m.ParticipantId == participantId);
            return Task.FromResult(n);
        }
    }

    public Task<Movie> InsertAsync(Movie movie, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(movie.Id) ? Guid.NewGuid().ToString("N")[..24] : movie.Id;
        var created = new Movie { Id = id, EventId = movie.EventId, ParticipantId = movie.ParticipantId, TmdbId = movie.TmdbId, Title = movie.Title, Year = movie.Year, PosterPath = movie.PosterPath, CreatedAt = movie.CreatedAt, UpdatedAt = movie.UpdatedAt };
        _byId[id] = created;
        var list = _byEventId.GetOrAdd(created.EventId, _ => new List<Movie>());
        lock (list) { list.Add(created); }
        return Task.FromResult(created);
    }

    public Task DeleteAsync(string movieId, CancellationToken ct = default)
    {
        if (_byId.TryRemove(movieId, out var m))
        {
            if (_byEventId.TryGetValue(m.EventId, out var list))
            {
                lock (list) { list.RemoveAll(x => x.Id == movieId); }
            }
        }
        return Task.CompletedTask;
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
}

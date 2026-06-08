using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemorySeenMarkRepository : ISeenMarkRepository
{
    private readonly ConcurrentDictionary<string, SeenMark> _byKey = new();

    private static string Key(string eventId, string movieId, string participantId) =>
        $"{eventId}|{movieId}|{participantId}";

    public Task<SeenMark> AddAsync(SeenMark mark, CancellationToken ct = default)
    {
        var k = Key(mark.EventId, mark.MovieId, mark.ParticipantId);
        var id = string.IsNullOrEmpty(mark.Id) ? Guid.NewGuid().ToString("N")[..24] : mark.Id;
        var now = DateTimeOffset.UtcNow;
        var entity = new SeenMark
        {
            Id = id,
            EventId = mark.EventId,
            MovieId = mark.MovieId,
            ParticipantId = mark.ParticipantId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _ = _byKey.AddOrUpdate(k, entity, (_, existing) => existing);
        return Task.FromResult(_byKey[k]);
    }

    public Task<bool> DeleteAsync(
        string eventId,
        string movieId,
        string participantId,
        CancellationToken ct = default)
    {
        var k = Key(eventId, movieId, participantId);
        return Task.FromResult(_byKey.TryRemove(k, out _));
    }

    public Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default)
    {
        foreach (var key in _byKey.Keys.ToArray())
        {
            if (_byKey.TryGetValue(key, out var r) && r.EventId == eventId && r.MovieId == movieId)
                _byKey.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }

    public Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        foreach (var key in _byKey.Keys.ToArray())
        {
            if (_byKey.TryGetValue(key, out var r) && r.EventId == eventId && r.ParticipantId == participantId)
                _byKey.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }

    public Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(0L);

        long count = 0;
        foreach (var key in _byKey.Keys.ToArray())
        {
            if (_byKey.TryGetValue(key, out var r) && r.EventId == eventId)
            {
                if (_byKey.TryRemove(key, out _))
                    count++;
            }
        }

        return Task.FromResult(count);
    }

    public Task<IReadOnlyDictionary<string, SeenMarkAggregate>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        var movieSet = new HashSet<string>(movieIds);
        var byMovie = new Dictionary<string, List<string>>();

        foreach (var r in _byKey.Values)
        {
            if (r.EventId != eventId || !movieSet.Contains(r.MovieId))
                continue;

            if (!byMovie.TryGetValue(r.MovieId, out var pids))
            {
                pids = new List<string>();
                byMovie[r.MovieId] = pids;
            }

            pids.Add(r.ParticipantId);
        }

        var result = new Dictionary<string, SeenMarkAggregate>();
        foreach (var (movieId, pids) in byMovie)
        {
            var distinct = pids.Distinct().ToList();
            result[movieId] = new SeenMarkAggregate(distinct.Count, distinct);
        }

        return Task.FromResult<IReadOnlyDictionary<string, SeenMarkAggregate>>(result);
    }

    public Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return Task.FromResult(0);

        var set = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet();
        var n = _byKey.Values.Count(s => set.Contains(s.ParticipantId));
        return Task.FromResult(n);
    }
}

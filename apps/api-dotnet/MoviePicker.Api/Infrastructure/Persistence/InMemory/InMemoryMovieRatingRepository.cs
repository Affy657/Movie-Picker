using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieRatingRepository : IMovieRatingRepository
{
    private readonly ConcurrentDictionary<string, MovieRating> _byKey = new();

    private static string Key(string eventId, string movieId, string participantId) =>
        $"{eventId}|{movieId}|{participantId}";

    public Task<MovieRating> UpsertAsync(MovieRating rating, CancellationToken ct = default)
    {
        var key = Key(rating.EventId, rating.MovieId, rating.ParticipantId);
        var now = DateTimeOffset.UtcNow;
        var saved = _byKey.AddOrUpdate(
            key,
            _ => rating with
            {
                Id = string.IsNullOrEmpty(rating.Id) ? Guid.NewGuid().ToString("N")[..24] : rating.Id,
                CreatedAt = now,
                UpdatedAt = now
            },
            (_, existing) => existing with { Value = rating.Value, UpdatedAt = now });
        return Task.FromResult(saved);
    }

    public Task<bool> DeleteAsync(string eventId, string movieId, string participantId, CancellationToken ct = default) =>
        Task.FromResult(_byKey.TryRemove(Key(eventId, movieId, participantId), out _));

    public Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        long deleted = 0;
        foreach (var key in _byKey.Keys.ToArray())
        {
            if (_byKey.TryGetValue(key, out var r) && r.EventId == eventId && _byKey.TryRemove(key, out _))
                deleted++;
        }

        return Task.FromResult(deleted);
    }

    public Task<IReadOnlyList<MovieRating>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        IReadOnlyList<MovieRating> list = _byKey.Values
            .Where(r => r.EventId == eventId)
            .OrderBy(r => r.CreatedAt)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<MovieRating>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        var ids = new HashSet<string>(participantIds);
        IReadOnlyList<MovieRating> list = _byKey.Values.Where(r => ids.Contains(r.ParticipantId)).ToList();
        return Task.FromResult(list);
    }
}

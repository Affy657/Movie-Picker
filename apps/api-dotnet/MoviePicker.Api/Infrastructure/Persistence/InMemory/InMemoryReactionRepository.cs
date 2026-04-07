using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryReactionRepository : IReactionRepository
{
    private readonly ConcurrentDictionary<string, Reaction> _byKey = new();

    private static string Key(string eventId, string movieId, string participantId, string reactionId) =>
        $"{eventId}|{movieId}|{participantId}|{reactionId}";

    public Task<Reaction> AddAsync(Reaction reaction, CancellationToken ct = default)
    {
        var k = Key(reaction.EventId, reaction.MovieId, reaction.ParticipantId, reaction.ReactionId);
        var id = string.IsNullOrEmpty(reaction.Id) ? Guid.NewGuid().ToString("N")[..24] : reaction.Id;
        var now = DateTimeOffset.UtcNow;
        var entity = new Reaction
        {
            Id = id,
            EventId = reaction.EventId,
            MovieId = reaction.MovieId,
            ParticipantId = reaction.ParticipantId,
            ReactionId = reaction.ReactionId,
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
        string reactionId,
        CancellationToken ct = default)
    {
        var k = Key(eventId, movieId, participantId, reactionId);
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

    public Task<IReadOnlyDictionary<string, IReadOnlyList<ReactionKindAggregate>>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        var movieSet = new HashSet<string>(movieIds);
        var groups = new Dictionary<string, Dictionary<string, List<string>>>();

        foreach (var r in _byKey.Values)
        {
            if (r.EventId != eventId || !movieSet.Contains(r.MovieId))
                continue;

            if (!groups.TryGetValue(r.MovieId, out var byReaction))
            {
                byReaction = new Dictionary<string, List<string>>();
                groups[r.MovieId] = byReaction;
            }

            if (!byReaction.TryGetValue(r.ReactionId, out var pids))
            {
                pids = new List<string>();
                byReaction[r.ReactionId] = pids;
            }

            pids.Add(r.ParticipantId);
        }

        var result = new Dictionary<string, IReadOnlyList<ReactionKindAggregate>>();
        foreach (var (movieId, byReaction) in groups)
        {
            var list = new List<ReactionKindAggregate>();
            foreach (var (reactionId, pids) in byReaction)
            {
                var distinct = pids.Distinct().ToList();
                list.Add(new ReactionKindAggregate(reactionId, distinct.Count, distinct));
            }

            result[movieId] = list;
        }

        return Task.FromResult<IReadOnlyDictionary<string, IReadOnlyList<ReactionKindAggregate>>>(result);
    }
}

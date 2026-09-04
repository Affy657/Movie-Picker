using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryVoteRepository : IVoteRepository
{
    private readonly ConcurrentDictionary<string, Vote> _byId = new();
    private readonly ConcurrentDictionary<string, List<Vote>> _byMovieId = new();

    public Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default)
    {
        if (_byMovieId.TryGetValue(movieId, out var list))
        {
            lock (list)
            {
                foreach (var v in list)
                    _byId.TryRemove(v.Id, out _);
                list.Clear();
            }
        }
        return Task.CompletedTask;
    }

    public Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(0L);

        var toRemove = _byId.Values.Where(v => v.EventId == eventId).ToList();
        foreach (var v in toRemove)
        {
            _byId.TryRemove(v.Id, out _);
            if (_byMovieId.TryGetValue(v.MovieId, out var list))
            {
                lock (list) { list.RemoveAll(x => x.Id == v.Id); }
            }
        }

        return Task.FromResult((long)toRemove.Count);
    }

    public Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        var toRemove = _byId.Values
            .Where(v => v.EventId == eventId && v.ParticipantId == participantId)
            .ToList();

        foreach (var v in toRemove)
        {
            _byId.TryRemove(v.Id, out _);
            if (_byMovieId.TryGetValue(v.MovieId, out var list))
            {
                lock (list)
                {
                    list.RemoveAll(x => x.Id == v.Id);
                }
            }
        }
        return Task.CompletedTask;
    }

    public Task<bool> DeleteByMovieAndParticipantAsync(string movieId, string participantId, CancellationToken ct = default)
    {
        if (!_byMovieId.TryGetValue(movieId, out var list))
            return Task.FromResult(false);

        Vote? toRemove;
        lock (list)
        {
            toRemove = list.FirstOrDefault(v => v.ParticipantId == participantId);
            if (toRemove is null)
                return Task.FromResult(false);
            list.RemoveAll(v => v.ParticipantId == participantId);
        }
        _byId.TryRemove(toRemove.Id, out _);
        return Task.FromResult(true);
    }

    public Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(vote.Id) ? Guid.NewGuid().ToString("N")[..24] : vote.Id;
        var created = new Vote { Id = id, EventId = vote.EventId, MovieId = vote.MovieId, ParticipantId = vote.ParticipantId, Value = vote.Value, CreatedAt = vote.CreatedAt, UpdatedAt = vote.UpdatedAt };
        _byId[id] = created;
        var list = _byMovieId.GetOrAdd(vote.MovieId, _ => []);
        lock (list)
        {
            list.RemoveAll(v => v.ParticipantId == vote.ParticipantId);
            list.Add(created);
        }
        return Task.FromResult(created);
    }

    public Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(IReadOnlyCollection<string> movieIds, CancellationToken ct = default)
    {
        var result = new Dictionary<string, VoteScoreAggregate>();
        foreach (var movieId in movieIds)
        {
            if (!_byMovieId.TryGetValue(movieId, out var list))
                continue;
            int up = 0, down = 0;
            lock (list)
            {
                foreach (var value in list.Select(v => v.Value))
                {
                    if (value == 1) up++;
                    else if (value == -1) down++;
                }
            }
            result[movieId] = new VoteScoreAggregate(up - down, up, down);
        }
        return Task.FromResult<IReadOnlyDictionary<string, VoteScoreAggregate>>(result);
    }

    public Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> AggregateUpVotersByMovieIdsAsync(IReadOnlyCollection<string> movieIds, CancellationToken ct = default)
    {
        var result = new Dictionary<string, IReadOnlyList<string>>();
        foreach (var movieId in movieIds)
        {
            if (!_byMovieId.TryGetValue(movieId, out var list))
                continue;
            var upVoters = new List<string>();
            lock (list)
            {
                foreach (var v in list)
                {
                    if (v.Value == 1)
                        upVoters.Add(v.ParticipantId);
                }
            }
            if (upVoters.Count > 0)
                result[movieId] = upVoters;
        }
        return Task.FromResult<IReadOnlyDictionary<string, IReadOnlyList<string>>>(result);
    }

    public Task<IReadOnlyDictionary<string, int>> GetParticipantVotesByEventAsync(
        string eventId,
        string participantId,
        CancellationToken ct = default)
    {
        var result = new Dictionary<string, int>();
        foreach (var v in _byId.Values)
        {
            if (v.EventId == eventId && v.ParticipantId == participantId)
                result[v.MovieId] = v.Value;
        }
        return Task.FromResult<IReadOnlyDictionary<string, int>>(result);
    }

    public Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return Task.FromResult(0);

        var set = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet();
        var n = _byId.Values.Count(v => set.Contains(v.ParticipantId));
        return Task.FromResult(n);
    }

    public Task<IReadOnlyList<Vote>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return Task.FromResult<IReadOnlyList<Vote>>(Array.Empty<Vote>());

        var set = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet();
        IReadOnlyList<Vote> result = _byId.Values.Where(v => set.Contains(v.ParticipantId)).ToList();
        return Task.FromResult(result);
    }

    public Task<int> CountDistinctVotersByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var n = _byId.Values.Where(v => v.EventId == eventId).Select(v => v.ParticipantId).Distinct().Count();
        return Task.FromResult(n);
    }
}

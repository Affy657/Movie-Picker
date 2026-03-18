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

    public Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(vote.Id) ? Guid.NewGuid().ToString("N")[..24] : vote.Id;
        var created = new Vote { Id = id, EventId = vote.EventId, MovieId = vote.MovieId, ParticipantId = vote.ParticipantId, Value = vote.Value, CreatedAt = vote.CreatedAt, UpdatedAt = vote.UpdatedAt };
        _byId[id] = created;
        var list = _byMovieId.GetOrAdd(vote.MovieId, _ => new List<Vote>());
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
                foreach (var v in list)
                {
                    if (v.Value == 1) up++;
                    else if (v.Value == -1) down++;
                }
            }
            result[movieId] = new VoteScoreAggregate(up - down, up, down);
        }
        return Task.FromResult<IReadOnlyDictionary<string, VoteScoreAggregate>>(result);
    }
}

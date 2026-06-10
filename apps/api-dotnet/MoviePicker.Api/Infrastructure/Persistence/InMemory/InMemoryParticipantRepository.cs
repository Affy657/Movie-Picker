using System.Collections.Concurrent;
using System.Linq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryParticipantRepository : IParticipantRepository
{
    private readonly ConcurrentDictionary<string, Participant> _byId = new();
    private readonly ConcurrentDictionary<(string EventId, string Pseudo), string> _eventPseudoToId = new();
    private readonly ConcurrentDictionary<(string EventId, string UserId), string> _eventUserToId = new();

    public Task<Participant?> FindByEventAndPseudoAsync(string eventId, string pseudo, CancellationToken ct = default)
    {
        var key = (eventId, pseudo.Trim());
        if (_eventPseudoToId.TryGetValue(key, out var id) && _byId.TryGetValue(id, out var p))
            return Task.FromResult<Participant?>(p);
        return Task.FromResult<Participant?>(null);
    }

    public Task<Participant?> FindByIdAndEventIdAsync(string participantId, string eventId, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(participantId, out var p) && p.EventId == eventId)
            return Task.FromResult<Participant?>(p);
        return Task.FromResult<Participant?>(null);
    }

    public Task<Participant?> FindByEventAndUserIdAsync(string eventId, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Task.FromResult<Participant?>(null);
        var key = (eventId, userId);
        if (_eventUserToId.TryGetValue(key, out var id) && _byId.TryGetValue(id, out var p))
            return Task.FromResult<Participant?>(p);
        return Task.FromResult<Participant?>(null);
    }

    public Task<IReadOnlyDictionary<string, string>> GetPseudosByIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        var dict = new Dictionary<string, string>();
        foreach (var id in participantIds)
            if (_byId.TryGetValue(id, out var p))
                dict[id] = p.Pseudo;
        return Task.FromResult<IReadOnlyDictionary<string, string>>(dict);
    }

    public Task<Participant> AddAsync(Participant participant, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(participant.Id) ? Guid.NewGuid().ToString("N")[..24] : participant.Id;
        var created = new Participant
        {
            Id = id,
            EventId = participant.EventId,
            Pseudo = participant.Pseudo,
            UserId = participant.UserId,
            CreatedAt = participant.CreatedAt,
            UpdatedAt = participant.UpdatedAt
        };
        _byId[id] = created;
        _eventPseudoToId[(created.EventId, created.Pseudo)] = id;
        if (!string.IsNullOrWhiteSpace(created.UserId))
            _eventUserToId[(created.EventId, created.UserId!)] = id;
        return Task.FromResult(created);
    }

    public Task<IReadOnlyList<string>> ListDistinctEventIdsByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());

        var ids = _byId.Values
            .Where(p => p.UserId == userId)
            .Select(p => p.EventId)
            .Distinct()
            .ToList();
        return Task.FromResult<IReadOnlyList<string>>(ids);
    }

    public Task<IReadOnlyList<Participant>> ListByUserIdAsync(string userId, int limit = 0, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Task.FromResult<IReadOnlyList<Participant>>(Array.Empty<Participant>());

        var query = _byId.Values.Where(p => p.UserId == userId);
        if (limit > 0)
            query = query.Take(limit);
        return Task.FromResult<IReadOnlyList<Participant>>(query.ToList());
    }

    public Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var n = _byId.Values.Count(p => p.EventId == eventId);
        return Task.FromResult(n);
    }

    public Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(
        IReadOnlyCollection<string> eventIds,
        CancellationToken ct = default)
    {
        var map = eventIds.Distinct().ToDictionary(id => id, _ => 0);
        foreach (var p in _byId.Values.Where(p => map.ContainsKey(p.EventId)))
            map[p.EventId]++;

        return Task.FromResult<IReadOnlyDictionary<string, int>>(map);
    }

    public Task<IReadOnlyList<Participant>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var list = _byId.Values
            .Where(p => p.EventId == eventId)
            .OrderBy(p => p.CreatedAt)
            .ToList();
        return Task.FromResult<IReadOnlyList<Participant>>(list);
    }

    public Task<bool> DeleteAsync(string participantId, string eventId, CancellationToken ct = default)
    {
        if (!_byId.TryGetValue(participantId, out var p) || p.EventId != eventId)
            return Task.FromResult(false);

        _byId.TryRemove(participantId, out _);
        _eventPseudoToId.TryRemove((p.EventId, p.Pseudo), out _);
        if (!string.IsNullOrWhiteSpace(p.UserId))
            _eventUserToId.TryRemove((p.EventId, p.UserId!), out _);
        return Task.FromResult(true);
    }

    public Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(0L);

        var toRemove = _byId.Values.Where(p => p.EventId == eventId).ToList();
        foreach (var p in toRemove)
        {
            _byId.TryRemove(p.Id, out _);
            _eventPseudoToId.TryRemove((p.EventId, p.Pseudo), out _);
            if (!string.IsNullOrWhiteSpace(p.UserId))
                _eventUserToId.TryRemove((p.EventId, p.UserId!), out _);
        }

        return Task.FromResult((long)toRemove.Count);
    }
}

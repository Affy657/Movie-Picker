using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryParticipantRepository : IParticipantRepository
{
    private readonly ConcurrentDictionary<string, Participant> _byId = new();
    private readonly ConcurrentDictionary<(string EventId, string Pseudo), string> _eventPseudoToId = new();

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
        var created = new Participant { Id = id, EventId = participant.EventId, Pseudo = participant.Pseudo, CreatedAt = participant.CreatedAt, UpdatedAt = participant.UpdatedAt };
        _byId[id] = created;
        _eventPseudoToId[(created.EventId, created.Pseudo)] = id;
        return Task.FromResult(created);
    }
}

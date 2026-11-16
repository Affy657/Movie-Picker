using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEventPresenceRepository : IEventPresenceRepository
{
    private sealed record Entry(string EventId, string ParticipantId, DateTimeOffset ExpiresAt, DateTimeOffset? ProposingUntil);

    private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);

    public Task TouchAsync(string eventId, string participantId, DateTimeOffset seenUntil, CancellationToken ct = default)
    {
        _entries.AddOrUpdate(
            Key(eventId, participantId),
            _ => new Entry(eventId, participantId, seenUntil, null),
            (_, existing) => existing with { ExpiresAt = seenUntil });
        return Task.CompletedTask;
    }

    public Task SetProposingAsync(
        string eventId,
        string participantId,
        DateTimeOffset seenUntil,
        DateTimeOffset? proposingUntil,
        CancellationToken ct = default)
    {
        _entries[Key(eventId, participantId)] = new Entry(eventId, participantId, seenUntil, proposingUntil);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ParticipantPresence>> ListActiveAsync(
        string eventId,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        IReadOnlyList<ParticipantPresence> active = _entries.Values
            .Where(e => e.EventId == eventId && e.ExpiresAt > now)
            .OrderBy(e => e.ParticipantId, StringComparer.Ordinal)
            .Select(e => new ParticipantPresence(e.ParticipantId, e.ProposingUntil is { } until && until > now))
            .ToList();
        return Task.FromResult(active);
    }

    private static string Key(string eventId, string participantId) => $"{eventId}:{participantId}";
}

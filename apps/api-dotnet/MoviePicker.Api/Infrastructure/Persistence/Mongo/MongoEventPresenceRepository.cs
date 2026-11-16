using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoEventPresenceRepository : IEventPresenceRepository
{
    public const string CollectionName = "event_presence";

    private static readonly UpdateOptions Upsert = new() { IsUpsert = true };

    private readonly TransactionalCollection<EventPresenceDocument> _collection;

    public MongoEventPresenceRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<EventPresenceDocument>(CollectionName);
    }

    public async Task TouchAsync(string eventId, string participantId, DateTimeOffset seenUntil, CancellationToken ct = default)
    {
        var update = Builders<EventPresenceDocument>.Update
            .Set(x => x.ExpiresAt, seenUntil.UtcDateTime)
            .SetOnInsert(x => x.EventId, eventId)
            .SetOnInsert(x => x.ParticipantId, participantId);
        await _collection.UpdateOneAsync(ById(eventId, participantId), update, Upsert, ct);
    }

    public async Task SetProposingAsync(
        string eventId,
        string participantId,
        DateTimeOffset seenUntil,
        DateTimeOffset? proposingUntil,
        CancellationToken ct = default)
    {
        var update = Builders<EventPresenceDocument>.Update
            .Set(x => x.ExpiresAt, seenUntil.UtcDateTime)
            .SetOnInsert(x => x.EventId, eventId)
            .SetOnInsert(x => x.ParticipantId, participantId);
        update = proposingUntil is { } until
            ? update.Set(x => x.ProposingUntil, until.UtcDateTime)
            : update.Unset(x => x.ProposingUntil);
        await _collection.UpdateOneAsync(ById(eventId, participantId), update, Upsert, ct);
    }

    public async Task<IReadOnlyList<ParticipantPresence>> ListActiveAsync(
        string eventId,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        var at = now.UtcDateTime;
        var filter = Builders<EventPresenceDocument>.Filter.Eq(x => x.EventId, eventId)
            & Builders<EventPresenceDocument>.Filter.Gt(x => x.ExpiresAt, at);
        var documents = await _collection
            .Find(filter)
            .Sort(Builders<EventPresenceDocument>.Sort.Ascending(x => x.ParticipantId))
            .ToListAsync(ct);
        return documents
            .Select(d => new ParticipantPresence(d.ParticipantId, d.ProposingUntil is { } until && until > at))
            .ToList();
    }

    private static FilterDefinition<EventPresenceDocument> ById(string eventId, string participantId) =>
        Builders<EventPresenceDocument>.Filter.Eq(x => x.Id, $"{eventId}:{participantId}");
}

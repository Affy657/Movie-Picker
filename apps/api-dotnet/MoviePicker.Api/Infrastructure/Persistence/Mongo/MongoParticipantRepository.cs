using System.Linq;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoParticipantRepository : IParticipantRepository
{
    internal const string EventPseudoIndexName = "participants_eventId_pseudo_unique";

    private readonly TransactionalCollection<ParticipantDocument> _collection;

    public MongoParticipantRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<ParticipantDocument>("participants");
    }

    public async Task<Participant?> FindByEventAndPseudoAsync(string eventId, string pseudo, CancellationToken ct = default)
    {
        var doc = await _collection
            .Find(x => x.EventId == eventId && x.Pseudo == pseudo)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : ParticipantDocumentMapper.ToDomain(doc);
    }

    public async Task<Participant?> FindByEventAndUserIdAsync(string eventId, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return null;
        var doc = await _collection
            .Find(x => x.EventId == eventId && x.UserId == userId)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : ParticipantDocumentMapper.ToDomain(doc);
    }

    public async Task<Participant?> FindByIdAndEventIdAsync(string participantId, string eventId, CancellationToken ct = default)
    {
        var doc = await _collection.Find(x => x.Id == participantId && x.EventId == eventId).FirstOrDefaultAsync(ct);
        return doc is null ? null : ParticipantDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyDictionary<string, string>> GetPseudosByIdsAsync(
        IReadOnlyCollection<string> participantIds,
        CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return new Dictionary<string, string>();

        var docs = await _collection
            .Find(x => participantIds.Contains(x.Id))
            .Project(x => new { x.Id, x.Pseudo })
            .ToListAsync(ct);
        return docs.ToDictionary(x => x.Id, x => x.Pseudo);
    }

    public async Task<Participant> AddAsync(Participant participant, CancellationToken ct = default)
    {
        var doc = ParticipantDocumentMapper.ToDocument(participant);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();

        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
            return ParticipantDocumentMapper.ToDomain(doc);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ParticipantConflictException(
                ex.WriteError.Message.Contains(EventPseudoIndexName, StringComparison.Ordinal)
                    ? ParticipantCollision.SamePseudo
                    : ParticipantCollision.SameAccount);
        }
    }

    public async Task<IReadOnlyList<string>> ListDistinctEventIdsByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return [];

        var ids = await _collection
            .Find(x => x.UserId == userId)
            .Project(x => x.EventId)
            .ToListAsync(ct);
        return ids.Distinct().ToList();
    }

    public async Task<IReadOnlyList<Participant>> ListByUserIdAsync(string userId, int limit = 0, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return [];

        IFindFluent<ParticipantDocument, ParticipantDocument> query = _collection
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt);
        if (limit > 0)
            query = query.Limit(limit);
        var docs = await query.ToListAsync(ct);
        return docs.Select(ParticipantDocumentMapper.ToDomain).ToList();
    }

    public async Task<IReadOnlyList<Participant>> ListByUserIdsAsync(
        IReadOnlyCollection<string> userIds,
        int limit = 0,
        CancellationToken ct = default)
    {
        var ids = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        IFindFluent<ParticipantDocument, ParticipantDocument> query = _collection
            .Find(x => x.UserId != null && ids.Contains(x.UserId))
            .SortByDescending(x => x.CreatedAt);
        if (limit > 0)
            query = query.Limit(limit);
        var docs = await query.ToListAsync(ct);
        return docs.Select(ParticipantDocumentMapper.ToDomain).ToList();
    }

    public async Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var c = await _collection.CountDocumentsAsync(x => x.EventId == eventId, cancellationToken: ct);
        return (int)c;
    }

    public async Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(
        IReadOnlyCollection<string> eventIds,
        CancellationToken ct = default)
    {
        if (eventIds.Count == 0)
            return new Dictionary<string, int>();

        var filter = Builders<ParticipantDocument>.Filter.In(x => x.EventId, eventIds);
        var groups = await _collection.Aggregate()
            .Match(filter)
            .Group(doc => doc.EventId, g => new { EventId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var map = eventIds.Distinct().ToDictionary(id => id, _ => 0);
        foreach (var row in groups)
            map[row.EventId] = row.Count;
        return map;
    }

    public async Task<IReadOnlyList<Participant>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.EventId == eventId)
            .SortBy(x => x.CreatedAt)
            .ToListAsync(ct);
        return docs.Select(ParticipantDocumentMapper.ToDomain).ToList();
    }

    public async Task<bool> DeleteAsync(string participantId, string eventId, CancellationToken ct = default)
    {
        var res = await _collection.DeleteOneAsync(
            x => x.Id == participantId && x.EventId == eventId,
            ct);
        return res.DeletedCount > 0;
    }

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;

        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> AnonymizeByUserIdAsync(string userId, string anonymizedPseudo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        var docs = await _collection.Find(x => x.UserId == userId).ToListAsync(ct);
        long count = 0;
        foreach (var doc in docs)
        {
            var pseudoTaken = await _collection.CountDocumentsAsync(
                x => x.EventId == doc.EventId && x.Pseudo == anonymizedPseudo,
                new CountOptions { Limit = 1 },
                ct) > 0;
            await _collection.UpdateOneAsync(
                x => x.Id == doc.Id,
                Builders<ParticipantDocument>.Update
                    .Unset(x => x.UserId)
                    .Set(x => x.Pseudo, pseudoTaken ? $"{anonymizedPseudo} {doc.Id[^6..]}" : anonymizedPseudo)
                    .Set(x => x.UpdatedAt, DateTime.UtcNow),
                cancellationToken: ct);
            count++;
        }

        return count;
    }
}

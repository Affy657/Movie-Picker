using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoParticipantRepository : IParticipantRepository
{
    private readonly IMongoCollection<ParticipantDocument> _collection;

    public MongoParticipantRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<ParticipantDocument>("participants");
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
            var byPseudo = await FindByEventAndPseudoAsync(participant.EventId, participant.Pseudo, ct);
            if (byPseudo is not null)
                return byPseudo;

            if (!string.IsNullOrWhiteSpace(participant.UserId))
            {
                var byUser = await FindByEventAndUserIdAsync(participant.EventId, participant.UserId, ct);
                if (byUser is not null)
                    return byUser;
            }

            throw;
        }
    }

    public async Task<IReadOnlyList<string>> ListDistinctEventIdsByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Array.Empty<string>();

        var ids = await _collection
            .Find(x => x.UserId == userId)
            .Project(x => x.EventId)
            .ToListAsync(ct);
        return ids.Distinct().ToList();
    }
}

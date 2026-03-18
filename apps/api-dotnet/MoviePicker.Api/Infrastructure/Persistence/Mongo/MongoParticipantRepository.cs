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
        return doc is null ? null : ToDomain(doc);
    }

    public async Task<Participant?> FindByIdAndEventIdAsync(string participantId, string eventId, CancellationToken ct = default)
    {
        var doc = await _collection.Find(x => x.Id == participantId && x.EventId == eventId).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
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
        var doc = new ParticipantDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            EventId = participant.EventId,
            Pseudo = participant.Pseudo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return ToDomain(doc);
    }

    private static Participant ToDomain(ParticipantDocument doc) => new()
    {
        Id = doc.Id,
        EventId = doc.EventId,
        Pseudo = doc.Pseudo,
        CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
        UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
    };
}

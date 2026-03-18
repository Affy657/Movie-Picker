using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoEventRepository : IEventRepository
{
    private readonly IMongoCollection<EventDocument> _collection;

    public MongoEventRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<EventDocument>("events");
    }

    public async Task<Event?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug))
            return null;

        EventDocument? doc = null;
        if (ObjectId.TryParse(idOrSlug, out _))
            doc = await _collection.Find(x => x.Id == idOrSlug).FirstOrDefaultAsync(ct);
        if (doc is null)
            doc = await _collection.Find(x => x.Slug == idOrSlug).FirstOrDefaultAsync(ct);

        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> AddAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();

        doc.CreatedAt = DateTime.UtcNow;
        doc.UpdatedAt = doc.CreatedAt;

        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> UpdateAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        doc.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(x => x.Id == evt.Id, doc, cancellationToken: ct);
        return EventDocumentMapper.ToDomain(doc);
    }
}

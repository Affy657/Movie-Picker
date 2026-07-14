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

        var filters = new List<FilterDefinition<EventDocument>>
        {
            Builders<EventDocument>.Filter.Eq(x => x.Slug, idOrSlug)
        };

        if (ObjectId.TryParse(idOrSlug, out _))
            filters.Add(Builders<EventDocument>.Filter.Eq(x => x.Id, idOrSlug));

        var filter = Builders<EventDocument>.Filter.Or(filters);
        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);

        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> AddAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();

        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> UpdateAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        await _collection.ReplaceOneAsync(x => x.Id == evt.Id, doc, cancellationToken: ct);
        return EventDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<Event>> ListByCreatorUserIdAsync(string creatorUserId, int limit, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId) || limit <= 0)
            return [];

        var docs = await _collection
            .Find(x => x.CreatorUserId == creatorUserId)
            .SortByDescending(x => x.UpdatedAt)
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<Event?> FindByCreatorAndTitleAsync(string creatorUserId, string title, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId) || string.IsNullOrEmpty(title))
            return null;

        var filter = Builders<EventDocument>.Filter.And(
            Builders<EventDocument>.Filter.Eq(x => x.CreatorUserId, creatorUserId),
            Builders<EventDocument>.Filter.Eq(x => x.Title, title));

        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<Event>> ListByIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default)
    {
        if (eventIds.Count == 0)
            return [];

        var ids = eventIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var docs = await _collection.Find(x => ids.Contains(x.Id)).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<int> CountByWinnerMovieIdsAsync(IReadOnlyCollection<string> movieIds, CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return 0;

        var ids = movieIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return 0;

        var filter = Builders<EventDocument>.Filter.In(x => x.WinnerMovieId, ids);
        var c = await _collection.CountDocumentsAsync(filter, cancellationToken: ct);
        return (int)c;
    }

    public async Task<bool> DeleteAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return false;

        var result = await _collection.DeleteOneAsync(x => x.Id == eventId, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    public async Task<IReadOnlyList<Event>> ListOpenEventsAsync(CancellationToken ct = default)
    {
        var filter = Builders<EventDocument>.Filter.Eq(x => x.ClosedAt, (DateTime?)null);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<long> AnonymizeCreatorAsync(string creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            return 0;
        var update = Builders<EventDocument>.Update.Unset(x => x.CreatorUserId);
        var res = await _collection.UpdateManyAsync(x => x.CreatorUserId == creatorUserId, update, cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
    }
}

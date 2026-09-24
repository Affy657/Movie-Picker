using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoEventRepository : IEventRepository
{
    internal const string CreationRequestIndexName = "events_creator_creationRequest_unique";

    private const string WriteSeqElement = "writeSeq";

    private readonly TransactionalCollection<EventDocument> _collection;

    public MongoEventRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<EventDocument>("events");
    }

    public async Task<Event?> GetByIdOrSlugAsync(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return null;

        var doc = await _collection.Find(Builders<EventDocument>.Filter.Eq(x => x.Slug, slug)).FirstOrDefaultAsync(ct);

        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> AddAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();

        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (
            ex.WriteError?.Category == ServerErrorCategory.DuplicateKey
            && ex.WriteError.Message.Contains(CreationRequestIndexName, StringComparison.Ordinal))
        {
            throw new EventCreationReplayedException();
        }

        return EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event?> FindByCreationRequestAsync(
        string creatorUserId,
        string creationRequestId,
        CancellationToken ct = default)
    {
        var doc = await _collection
            .Find(x => x.CreatorUserId == creatorUserId && x.CreationRequestId == creationRequestId)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<Event> UpdateAsync(Event evt, CancellationToken ct = default)
    {
        var doc = EventDocumentMapper.ToDocument(evt);
        doc.Version = evt.Version + 1;
        var filter = Builders<EventDocument>.Filter.And(
            Builders<EventDocument>.Filter.Eq(x => x.Id, evt.Id),
            OptimisticConcurrency.ExpectedVersion<EventDocument>(x => x.Version, evt.Version));
        var result = await _collection.UpdateOneAsync(filter, KnownFieldsUpdate.From(doc, WriteSeqElement), cancellationToken: ct);
        if (result.MatchedCount == 0)
            await OptimisticConcurrency.ThrowForUnmatchedWriteAsync(_collection, x => x.Id == evt.Id, Errors.EventNotFound, ct);
        return EventDocumentMapper.ToDomain(doc);
    }

    public Task LockForWriteAsync(string eventId, CancellationToken ct = default) =>
        IncrementWriteSeqAsync(eventId, ct);

    public Task MarkChangedAsync(string eventId, CancellationToken ct = default) =>
        IncrementWriteSeqAsync(eventId, ct);

    private async Task IncrementWriteSeqAsync(string eventId, CancellationToken ct)
    {
        var result = await _collection.UpdateOneAsync(
            x => x.Id == eventId,
            Builders<EventDocument>.Update.Inc(x => x.WriteSeq, 1),
            cancellationToken: ct);
        if (result.MatchedCount == 0)
            throw Errors.EventNotFound();
    }

    public async Task<IReadOnlyList<Event>> ListAllByCreatorUserIdAsync(string creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            return [];

        var docs = await _collection
            .Find(x => x.CreatorUserId == creatorUserId)
            .SortByDescending(x => x.UpdatedAt)
            .ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
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

        var filter = Builders<EventDocument>.Filter.In("winners.movieId", ToObjectIds(ids));
        var c = await _collection.CountDocumentsAsync(filter, cancellationToken: ct);
        return (int)c;
    }

    private static IEnumerable<ObjectId> ToObjectIds(IEnumerable<string> ids)
    {
        foreach (var id in ids)
        {
            if (ObjectId.TryParse(id, out var parsed))
                yield return parsed;
        }
    }

    public async Task<bool> DeleteAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return false;

        var result = await _collection.DeleteOneAsync(x => x.Id == eventId, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    public async Task<IReadOnlyList<Event>> ListOpenEventsStartingBetweenAsync(
        DateTimeOffset fromInclusive,
        DateTimeOffset toInclusive,
        CancellationToken ct = default)
    {
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.Eq(x => x.ClosedAt, (DateTime?)null),
            builder.Gte(x => x.StartAtUtc, fromInclusive.UtcDateTime),
            builder.Lte(x => x.StartAtUtc, toInclusive.UtcDateTime));
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<Event>> ListMissingStartAtAsync(int limit, CancellationToken ct = default)
    {
        if (limit <= 0)
            return [];

        var filter = Builders<EventDocument>.Filter.Exists(x => x.StartAtUtc, false);
        var docs = await _collection.Find(filter).Limit(limit).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<Event>> ListRecurringAwaitingNextOccurrenceAsync(
        string? creatorUserId,
        CancellationToken ct = default)
    {
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.Ne(x => x.Recurrence, null)
                     & builder.Eq(x => x.NextOccurrenceEventId, (string?)null);

        if (!string.IsNullOrWhiteSpace(creatorUserId))
            filter &= builder.Eq(x => x.CreatorUserId, creatorUserId);

        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<Event>> ListAwaitingWatchlistCleanupAsync(
        DateTimeOffset utcNow,
        int limit,
        CancellationToken ct = default)
    {
        if (limit <= 0)
            return [];

        var wonAndOverStartedBefore = (utcNow - EventSchedule.PendingDelay).UtcDateTime;
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.SizeGt(x => x.Winners, 0),
            builder.Eq(x => x.WatchlistCleanedAt, (DateTime?)null),
            builder.Or(
                builder.Ne(x => x.ClosedAt, (DateTime?)null),
                builder.Lte(x => x.StartAtUtc, wonAndOverStartedBefore)));
        var docs = await _collection.Find(filter).Limit(limit).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<bool> MarkWatchlistCleanedAsync(string eventId, DateTimeOffset cleanedAt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return false;

        var filter = Builders<EventDocument>.Filter.And(
            Builders<EventDocument>.Filter.Eq(x => x.Id, eventId),
            Builders<EventDocument>.Filter.Eq(x => x.WatchlistCleanedAt, null));
        var update = Builders<EventDocument>.Update
            .Set(x => x.WatchlistCleanedAt, cleanedAt.UtcDateTime)
            .Set(x => x.UpdatedAt, cleanedAt.UtcDateTime)
            .Inc(x => x.Version, 1)
            .Inc(x => x.WriteSeq, 1);

        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<long> AnonymizeCreatorAsync(string creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            return 0;
        var update = Builders<EventDocument>.Update
            .Unset(x => x.CreatorUserId)
            .Inc(x => x.Version, 1)
            .Inc(x => x.WriteSeq, 1);
        var res = await _collection.UpdateManyAsync(x => x.CreatorUserId == creatorUserId, update, cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
    }
}

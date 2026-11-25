using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoEventRepository : IEventRepository
{
    internal const string CreationRequestIndexName = "events_creator_creationRequest_unique";

    private const string WriteSeqElement = "writeSeq";

    private static readonly BsonDocumentFilterDefinition<EventDocument> WheelPickNewerThanTheLastAnnouncement = new(
        new BsonDocument(
            "$expr",
            new BsonDocument(
                "$anyElementTrue",
                new BsonArray
                {
                    new BsonDocument(
                        "$map",
                        new BsonDocument
                        {
                            { "input", new BsonDocument("$ifNull", new BsonArray { "$winners", new BsonArray() }) },
                            {
                                "in",
                                new BsonDocument(
                                    "$and",
                                    new BsonArray
                                    {
                                        new BsonDocument("$ne", new BsonArray { "$$this.pickMethod", "manual" }),
                                        new BsonDocument("$gt", new BsonArray { "$$this.pickedAt", "$winnerAnnouncedAt" })
                                    })
                            }
                        })
                })));

    private static readonly BsonDocumentFilterDefinition<EventDocument> EveryWinnerDrawn = new(
        new BsonDocument(
            "$expr",
            new BsonDocument(
                "$gte",
                new BsonArray
                {
                    new BsonDocument("$size", new BsonDocument("$ifNull", new BsonArray { "$winners", new BsonArray() })),
                    new BsonDocument(
                        "$max",
                        new BsonArray
                        {
                            1,
                            new BsonDocument("$ifNull", new BsonArray { "$config.winnerCount", EventConfig.DefaultWinnerCount })
                        })
                })));

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

    public async Task<IReadOnlyList<string>> ListIdsByCreatorUserIdAsync(string creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            return [];

        return await _collection
            .Find(x => x.CreatorUserId == creatorUserId)
            .Project(x => x.Id)
            .ToListAsync(ct);
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

    public async Task<IReadOnlyList<Event>> ListOpenWithUnannouncedWheelPickAsync(
        DateTimeOffset startingFrom,
        CancellationToken ct = default)
    {
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.Eq(x => x.ClosedAt, (DateTime?)null),
            builder.Gte(x => x.StartAtUtc, startingFrom.UtcDateTime),
            WheelPickNewerThanTheLastAnnouncement);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<Event?> GetByRecapSlugAsync(string recapSlug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(recapSlug))
            return null;

        var doc = await _collection.Find(Builders<EventDocument>.Filter.Eq(x => x.RecapSlug, recapSlug)).FirstOrDefaultAsync(ct);
        return doc is null ? null : EventDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<Event>> ListMissingRecapSlugAsync(int limit, CancellationToken ct = default)
    {
        if (limit <= 0)
            return [];

        var filter = Builders<EventDocument>.Filter.Exists(x => x.RecapSlug, false);
        var docs = await _collection.Find(filter).Limit(limit).ToListAsync(ct);
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

    public async Task<IReadOnlyList<Event>> ListWithWinnerStartingBetweenAsync(
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken ct = default)
    {
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.SizeGt(x => x.Winners, 0),
            builder.Gte(x => x.StartAtUtc, fromInclusive.UtcDateTime),
            builder.Lt(x => x.StartAtUtc, toExclusive.UtcDateTime));
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<Event>> ListOpenByGroupIdsAsync(
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        var ids = groupIds.Where(MongoObjectIds.IsValid).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var startedAfter = (utcNow - EventSchedule.PendingDelay - EventSchedule.AutoCloseDelay).UtcDateTime;
        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.In(x => x.GroupId, ids),
            builder.Eq(x => x.ClosedAt, (DateTime?)null),
            builder.Or(
                builder.Gte(x => x.StartAtUtc, startedAfter),
                builder.Eq(x => x.StartAtUtc, (DateTime?)null)));
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<HeldGroupNight>> ListHeldByGroupIdsAsync(
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        var ids = groupIds.Where(MongoObjectIds.IsValid).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.In(x => x.GroupId, ids),
            builder.SizeGt(x => x.Winners, 0),
            FinishedBy(utcNow));
        var docs = await _collection.Find(filter)
            .Sort(Builders<EventDocument>.Sort.Descending(x => x.Date).Descending(x => x.Time).Descending(x => x.Id))
            .Project<EventDocument>(Builders<EventDocument>.Projection
                .Include(x => x.GroupId)
                .Include(x => x.Date)
                .Include(x => x.Time)
                .Include("winners.movieId"))
            .ToListAsync(ct);
        return docs.ConvertAll(doc => new HeldGroupNight(
            doc.Id,
            doc.GroupId ?? string.Empty,
            doc.Date,
            doc.Time,
            (doc.Winners ?? []).ConvertAll(winner => winner.MovieId)));
    }

    private static FilterDefinition<EventDocument> FinishedBy(DateTimeOffset utcNow)
    {
        var pendingSinceStartedBefore = (utcNow - EventSchedule.PendingDelay).UtcDateTime;
        var autoClosedStartedBefore = (utcNow - EventSchedule.PendingDelay - EventSchedule.AutoCloseDelay).UtcDateTime;
        var builder = Builders<EventDocument>.Filter;
        return builder.Or(
            builder.Ne(x => x.ClosedAt, (DateTime?)null),
            builder.Lte(x => x.StartAtUtc, autoClosedStartedBefore),
            builder.And(builder.Lte(x => x.StartAtUtc, pendingSinceStartedBefore), EveryWinnerDrawn));
    }

    public async Task<IReadOnlyList<Event>> ListTitleMatchesAsync(
        string creatorUserId,
        IReadOnlyCollection<string> eventIds,
        IReadOnlyCollection<string> groupIds,
        string query,
        CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length == 0)
            return [];

        var filter = Builders<EventDocument>.Filter;
        var ids = eventIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var groups = groupIds.Where(MongoObjectIds.IsValid).Distinct().ToList();
        List<FilterDefinition<EventDocument>> reachable =
        [
            filter.In(x => x.Id, ids),
            filter.In(x => x.GroupId, groups)
        ];
        if (!string.IsNullOrWhiteSpace(creatorUserId))
            reachable.Add(filter.Eq(x => x.CreatorUserId, creatorUserId));

        var titled = filter.Regex(x => x.Title, new BsonRegularExpression(UserSearchPolicy.ToRegexPattern(normalized), "i"));
        var docs = await _collection.Find(titled & filter.Or(reachable)).ToListAsync(ct);
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

        var builder = Builders<EventDocument>.Filter;
        var filter = builder.And(
            builder.SizeGt(x => x.Winners, 0),
            builder.Eq(x => x.WatchlistCleanedAt, (DateTime?)null),
            FinishedBy(utcNow));
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

    public async Task<long> ForgetRemovedUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var update = Builders<EventDocument>.Update
            .Pull(x => x.RemovedUserIds, userId)
            .Inc(x => x.Version, 1)
            .Inc(x => x.WriteSeq, 1);
        var filter = Builders<EventDocument>.Filter.AnyEq(x => x.RemovedUserIds, userId);
        var res = await _collection.UpdateManyAsync(filter, update, cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
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

    public async Task<long> DetachGroupsAsync(IReadOnlyCollection<string> groupIds, CancellationToken ct = default)
    {
        var ids = groupIds.Where(MongoObjectIds.IsValid).Distinct().ToList();
        if (ids.Count == 0)
            return 0;
        var update = Builders<EventDocument>.Update
            .Unset(x => x.GroupId)
            .Inc(x => x.Version, 1)
            .Inc(x => x.WriteSeq, 1);
        var res = await _collection.UpdateManyAsync(Builders<EventDocument>.Filter.In(x => x.GroupId, ids), update, cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
    }
}

using System.Globalization;
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

    public async Task<IReadOnlyList<HeldGroupNightTally>> TallyHeldByGroupIdsAsync(
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        var ids = groupIds.Where(MongoObjectIds.IsValid).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var rows = await _collection.Aggregate()
            .Match(HeldNightsOf(ids, utcNow))
            .AppendStage<BsonDocument>(HeldNightFieldsStage)
            .AppendStage<BsonDocument>(RatedWinnersStage)
            .AppendStage<BsonDocument>(HeldNightTallyStage)
            .ToListAsync(ct);
        return rows.ConvertAll(ToHeldGroupNightTally);
    }

    public async Task<IReadOnlyList<Event>> ListLatestHeldByGroupIdAsync(
        string groupId,
        DateTimeOffset utcNow,
        int limit,
        CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(groupId) || limit <= 0)
            return [];

        var docs = await _collection.Find(HeldNightsOf([groupId], utcNow))
            .Sort(Builders<EventDocument>.Sort.Descending(x => x.Date).Descending(x => x.Time).Descending(x => x.Id))
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(EventDocumentMapper.ToDomain);
    }

    private static FilterDefinition<EventDocument> HeldNightsOf(IReadOnlyCollection<string> groupIds, DateTimeOffset utcNow)
    {
        var builder = Builders<EventDocument>.Filter;
        return builder.And(
            builder.In(x => x.GroupId, groupIds),
            builder.SizeGt(x => x.Winners, 0),
            FinishedBy(utcNow));
    }

    private static readonly BsonDocument HeldNightFieldsStage = new(
        "$project",
        new BsonDocument
        {
            { "groupId", 1 },
            { "date", 1 },
            { "time", 1 },
            { "winnerIds", "$winners.movieId" },
            {
                "weekday",
                new BsonDocument(
                    "$dayOfWeek",
                    new BsonDocument(
                        "$dateFromString",
                        new BsonDocument
                        {
                            { "dateString", "$date" },
                            { "format", "%Y-%m-%d" },
                            { "onError", BsonNull.Value },
                            { "onNull", BsonNull.Value }
                        }))
            }
        });

    private static readonly BsonDocument RatedWinnersStage = new(
        "$lookup",
        new BsonDocument
        {
            { "from", MongoMovieRatingRepository.CollectionName },
            { "localField", "_id" },
            { "foreignField", "eventId" },
            { "let", new BsonDocument("winnerIds", "$winnerIds") },
            {
                "pipeline",
                new BsonArray
                {
                    new BsonDocument(
                        "$match",
                        new BsonDocument("$expr", new BsonDocument("$in", new BsonArray { "$movieId", "$$winnerIds" }))),
                    new BsonDocument(
                        "$group",
                        new BsonDocument { { "_id", "$movieId" }, { "average", new BsonDocument("$avg", "$value") } })
                }
            },
            { "as", "ratedFilms" }
        });

    private static readonly BsonDocument HeldNightTallyStage = BuildHeldNightTallyStage();

    private static BsonDocument BuildHeldNightTallyStage()
    {
        var tally = new BsonDocument
        {
            { "_id", "$groupId" },
            { "nightCount", new BsonDocument("$sum", 1) },
            {
                "filmCount",
                new BsonDocument("$sum", new BsonDocument("$size", new BsonDocument("$setUnion", new BsonArray { "$winnerIds", new BsonArray() })))
            },
            { "firstNightDate", new BsonDocument("$min", "$date") },
            { "ratedFilmCount", new BsonDocument("$sum", new BsonDocument("$size", "$ratedFilms")) },
            { "ratedFilmAverageSum", new BsonDocument("$sum", new BsonDocument("$sum", "$ratedFilms.average")) },
            {
                "lastNight",
                new BsonDocument(
                    "$top",
                    new BsonDocument
                    {
                        { "sortBy", new BsonDocument { { "date", -1 }, { "time", -1 }, { "_id", -1 } } },
                        {
                            "output",
                            new BsonDocument { { "id", "$_id" }, { "date", "$date" }, { "time", "$time" }, { "winnerIds", "$winnerIds" } }
                        }
                    })
            }
        };
        foreach (var day in Enum.GetValues<DayOfWeek>())
        {
            tally.Add(
                WeekdayField(day),
                new BsonDocument(
                    "$sum",
                    new BsonDocument("$cond", new BsonArray { new BsonDocument("$eq", new BsonArray { "$weekday", MongoDayOfWeek(day) }), 1, 0 })));
        }

        return new BsonDocument("$group", tally);
    }

    private static string WeekdayField(DayOfWeek day) => "weekday" + MongoDayOfWeek(day).ToString(CultureInfo.InvariantCulture);

    private static int MongoDayOfWeek(DayOfWeek day) => (int)day + 1;

    private static HeldGroupNightTally ToHeldGroupNightTally(BsonDocument row)
    {
        var last = row["lastNight"].AsBsonDocument;
        var groupId = row["_id"].AsObjectId.ToString();
        var ratedFilmCount = row["ratedFilmCount"].ToInt32();
        var nightsByWeekday = Enum.GetValues<DayOfWeek>()
            .Select(day => (Day: day, Count: row[WeekdayField(day)].ToInt32()))
            .Where(perDay => perDay.Count > 0)
            .ToDictionary(perDay => perDay.Day, perDay => perDay.Count);
        return new HeldGroupNightTally(
            groupId,
            row["nightCount"].ToInt32(),
            row["filmCount"].ToInt32(),
            StringOrEmpty(row.GetValue("firstNightDate", BsonNull.Value)),
            ratedFilmCount == 0 ? null : row["ratedFilmAverageSum"].ToDouble() / ratedFilmCount,
            nightsByWeekday,
            new HeldGroupNight(
                last["id"].AsObjectId.ToString(),
                groupId,
                StringOrEmpty(last.GetValue("date", BsonNull.Value)),
                StringOrEmpty(last.GetValue("time", BsonNull.Value)),
                last.GetValue("winnerIds", new BsonArray()).AsBsonArray.Select(id => id.AsObjectId.ToString()).ToList()));
    }

    private static string StringOrEmpty(BsonValue value) => value.IsString ? value.AsString : string.Empty;

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

    public async Task<long> ForgetUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var update = Builders<EventDocument>.Update
            .Pull(x => x.RemovedUserIds, userId)
            .Pull(x => x.CoHostUserIds, userId)
            .Inc(x => x.Version, 1)
            .Inc(x => x.WriteSeq, 1);
        var filter = Builders<EventDocument>.Filter.Or(
            Builders<EventDocument>.Filter.AnyEq(x => x.RemovedUserIds, userId),
            Builders<EventDocument>.Filter.AnyEq(x => x.CoHostUserIds, userId));
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

using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoVoteRepository : IVoteRepository
{
    private readonly TransactionalCollection<VoteDocument> _collection;

    public MongoVoteRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<VoteDocument>("votes");
    }

    public async Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default)
    {
        await _collection.DeleteManyAsync(x => x.MovieId == movieId, cancellationToken: ct);
    }

    public async Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        await _collection.DeleteManyAsync(
            x => x.EventId == eventId && x.ParticipantId == participantId,
            cancellationToken: ct);
    }

    public async Task<bool> DeleteByMovieAndParticipantAsync(string movieId, string participantId, CancellationToken ct = default)
    {
        var res = await _collection.DeleteOneAsync(
            x => x.MovieId == movieId && x.ParticipantId == participantId,
            cancellationToken: ct);
        return res.IsAcknowledged && res.DeletedCount > 0;
    }

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;

        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<VoteDocument>.Filter.And(
            Builders<VoteDocument>.Filter.Eq(x => x.MovieId, vote.MovieId),
            Builders<VoteDocument>.Filter.Eq(x => x.ParticipantId, vote.ParticipantId));

        var update = Builders<VoteDocument>.Update
            .Set(x => x.EventId, vote.EventId)
            .Set(x => x.Value, vote.Value)
            .Set(x => x.UpdatedAt, now)
            .SetOnInsert(x => x.MovieId, vote.MovieId)
            .SetOnInsert(x => x.ParticipantId, vote.ParticipantId)
            .SetOnInsert(x => x.CreatedAt, now);

        var options = new FindOneAndUpdateOptions<VoteDocument>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };

        var doc = await _collection.FindOneAndUpdateAsync(filter, update, options, ct);
        return VoteMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return new Dictionary<string, VoteScoreAggregate>();

        var oids = new List<ObjectId>();
        foreach (var id in movieIds)
        {
            if (ObjectId.TryParse(id, out var oid))
                oids.Add(oid);
        }

        if (oids.Count == 0)
            return new Dictionary<string, VoteScoreAggregate>();

        var pipeline = new[]
        {
            new BsonDocument("$match", new BsonDocument("movieId", new BsonDocument("$in", new BsonArray(oids)))),
            new BsonDocument(
                "$group",
                new BsonDocument
                {
                    { "_id", "$movieId" },
                    { "score", new BsonDocument("$sum", "$value") },
                    {
                        "up",
                        new BsonDocument(
                            "$sum",
                            new BsonDocument(
                                "$cond",
                                new BsonArray { new BsonDocument("$eq", new BsonArray { "$value", 1 }), 1, 0 }))
                    },
                    {
                        "down",
                        new BsonDocument(
                            "$sum",
                            new BsonDocument(
                                "$cond",
                                new BsonArray { new BsonDocument("$eq", new BsonArray { "$value", -1 }), 1, 0 }))
                    }
                })
        };

        using var cursor = await _collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        var results = await cursor.ToListAsync(ct);
        var dict = new Dictionary<string, VoteScoreAggregate>();
        foreach (var r in results)
        {
            var id = r["_id"].AsObjectId.ToString();
            dict[id] = new VoteScoreAggregate(
                r["score"].ToInt32(),
                r["up"].ToInt32(),
                r["down"].ToInt32());
        }

        return dict;
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> AggregateUpVotersByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return new Dictionary<string, IReadOnlyList<string>>();

        var oids = new List<ObjectId>();
        foreach (var id in movieIds)
        {
            if (ObjectId.TryParse(id, out var oid))
                oids.Add(oid);
        }

        if (oids.Count == 0)
            return new Dictionary<string, IReadOnlyList<string>>();

        var pipeline = new[]
        {
            new BsonDocument(
                "$match",
                new BsonDocument
                {
                    { "movieId", new BsonDocument("$in", new BsonArray(oids)) },
                    { "value", 1 }
                }),
            new BsonDocument(
                "$group",
                new BsonDocument
                {
                    { "_id", "$movieId" },
                    { "participantIds", new BsonDocument("$push", "$participantId") }
                })
        };

        using var cursor = await _collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        var results = await cursor.ToListAsync(ct);
        var dict = new Dictionary<string, IReadOnlyList<string>>();
        foreach (var r in results)
        {
            var id = r["_id"].AsObjectId.ToString();
            var pids = r["participantIds"].AsBsonArray.Select(v => v.AsObjectId.ToString()).ToList();
            dict[id] = pids;
        }

        return dict;
    }

    public async Task<IReadOnlyDictionary<string, int>> GetParticipantVotesByEventAsync(
        string eventId,
        string participantId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(eventId) || string.IsNullOrEmpty(participantId))
            return new Dictionary<string, int>();

        var docs = await _collection
            .Find(x => x.EventId == eventId && x.ParticipantId == participantId)
            .ToListAsync(ct);

        var dict = new Dictionary<string, int>(docs.Count);
        foreach (var d in docs)
            dict[d.MovieId] = d.Value;
        return dict;
    }

    public async Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return 0;

        var ids = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return 0;

        var filter = Builders<VoteDocument>.Filter.In(x => x.ParticipantId, ids);
        var c = await _collection.CountDocumentsAsync(filter, cancellationToken: ct);
        return (int)c;
    }

    public async Task<IReadOnlyList<Vote>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return [];

        var ids = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var filter = Builders<VoteDocument>.Filter.In(x => x.ParticipantId, ids);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(VoteMapper.ToDomain);
    }

    public async Task<int> CountDistinctVotersByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;

        var filter = Builders<VoteDocument>.Filter.Eq(x => x.EventId, eventId);
        var cursor = await _collection.DistinctAsync(x => x.ParticipantId, filter, cancellationToken: ct);
        var ids = await cursor.ToListAsync(ct);
        return ids.Count;
    }
}

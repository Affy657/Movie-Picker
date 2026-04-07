using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoReactionRepository : IReactionRepository
{
    private readonly IMongoCollection<ReactionDocument> _collection;

    public MongoReactionRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<ReactionDocument>("reactions");
    }

    public async Task<Reaction> AddAsync(Reaction reaction, CancellationToken ct = default)
    {
        var filter = Builders<ReactionDocument>.Filter.And(
            Builders<ReactionDocument>.Filter.Eq(x => x.EventId, reaction.EventId),
            Builders<ReactionDocument>.Filter.Eq(x => x.MovieId, reaction.MovieId),
            Builders<ReactionDocument>.Filter.Eq(x => x.ParticipantId, reaction.ParticipantId),
            Builders<ReactionDocument>.Filter.Eq(x => x.ReactionId, reaction.ReactionId));

        var existing = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        if (existing is not null)
            return ReactionMapper.ToDomain(existing);

        var now = DateTime.UtcNow;
        var doc = new ReactionDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            EventId = reaction.EventId,
            MovieId = reaction.MovieId,
            ParticipantId = reaction.ParticipantId,
            ReactionId = reaction.ReactionId,
            CreatedAt = now,
            UpdatedAt = now
        };

        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == 11000)
        {
            var again = await _collection.Find(filter).FirstAsync(ct);
            return ReactionMapper.ToDomain(again);
        }

        return ReactionMapper.ToDomain(doc);
    }

    public async Task<bool> DeleteAsync(
        string eventId,
        string movieId,
        string participantId,
        string reactionId,
        CancellationToken ct = default)
    {
        var filter = Builders<ReactionDocument>.Filter.And(
            Builders<ReactionDocument>.Filter.Eq(x => x.EventId, eventId),
            Builders<ReactionDocument>.Filter.Eq(x => x.MovieId, movieId),
            Builders<ReactionDocument>.Filter.Eq(x => x.ParticipantId, participantId),
            Builders<ReactionDocument>.Filter.Eq(x => x.ReactionId, reactionId));

        var res = await _collection.DeleteOneAsync(filter, ct);
        return res.DeletedCount > 0;
    }

    public async Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default) =>
        await _collection.DeleteManyAsync(
            x => x.EventId == eventId && x.MovieId == movieId,
            cancellationToken: ct);

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<ReactionKindAggregate>>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return new Dictionary<string, IReadOnlyList<ReactionKindAggregate>>();

        if (!ObjectId.TryParse(eventId, out var eventOid))
            return new Dictionary<string, IReadOnlyList<ReactionKindAggregate>>();

        var movieOids = new List<ObjectId>();
        foreach (var id in movieIds)
        {
            if (ObjectId.TryParse(id, out var m))
                movieOids.Add(m);
        }

        if (movieOids.Count == 0)
            return new Dictionary<string, IReadOnlyList<ReactionKindAggregate>>();

        var pipeline = new[]
        {
            new BsonDocument(
                "$match",
                new BsonDocument
                {
                    { "eventId", eventOid },
                    { "movieId", new BsonDocument("$in", new BsonArray(movieOids)) }
                }),
            new BsonDocument(
                "$group",
                new BsonDocument
                {
                    { "_id", new BsonDocument { { "movieId", "$movieId" }, { "reactionId", "$reactionId" } } },
                    { "count", new BsonDocument("$sum", 1) },
                    { "participantIds", new BsonDocument("$push", "$participantId") }
                })
        };

        var results = await _collection.Aggregate<BsonDocument>(pipeline, cancellationToken: ct).ToListAsync(ct);
        var byMovie = new Dictionary<string, List<ReactionKindAggregate>>();

        foreach (var r in results)
        {
            var idDoc = r["_id"].AsBsonDocument;
            var movieIdStr = idDoc["movieId"].AsObjectId.ToString();
            var reactionId = idDoc["reactionId"].AsString;
            var count = r["count"].ToInt32();
            var pids = r["participantIds"].AsBsonArray.Select(v => v.AsObjectId.ToString()).Distinct().ToList();

            if (!byMovie.TryGetValue(movieIdStr, out var list))
            {
                list = new List<ReactionKindAggregate>();
                byMovie[movieIdStr] = list;
            }

            list.Add(new ReactionKindAggregate(reactionId, count, pids));
        }

        return byMovie.ToDictionary(kv => kv.Key, kv => (IReadOnlyList<ReactionKindAggregate>)kv.Value);
    }
}

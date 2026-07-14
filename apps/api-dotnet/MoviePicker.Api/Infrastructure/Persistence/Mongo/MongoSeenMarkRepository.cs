using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoSeenMarkRepository : ISeenMarkRepository
{
    private readonly IMongoCollection<SeenMarkDocument> _collection;

    public MongoSeenMarkRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<SeenMarkDocument>("seen_marks");
    }

    public async Task<SeenMark> AddAsync(SeenMark mark, CancellationToken ct = default)
    {
        var filter = Builders<SeenMarkDocument>.Filter.And(
            Builders<SeenMarkDocument>.Filter.Eq(x => x.EventId, mark.EventId),
            Builders<SeenMarkDocument>.Filter.Eq(x => x.MovieId, mark.MovieId),
            Builders<SeenMarkDocument>.Filter.Eq(x => x.ParticipantId, mark.ParticipantId));

        var existing = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        if (existing is not null)
            return SeenMarkMapper.ToDomain(existing);

        var now = DateTime.UtcNow;
        var doc = new SeenMarkDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            EventId = mark.EventId,
            MovieId = mark.MovieId,
            ParticipantId = mark.ParticipantId,
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
            return SeenMarkMapper.ToDomain(again);
        }

        return SeenMarkMapper.ToDomain(doc);
    }

    public async Task<bool> DeleteAsync(
        string eventId,
        string movieId,
        string participantId,
        CancellationToken ct = default)
    {
        var filter = Builders<SeenMarkDocument>.Filter.And(
            Builders<SeenMarkDocument>.Filter.Eq(x => x.EventId, eventId),
            Builders<SeenMarkDocument>.Filter.Eq(x => x.MovieId, movieId),
            Builders<SeenMarkDocument>.Filter.Eq(x => x.ParticipantId, participantId));

        var res = await _collection.DeleteOneAsync(filter, ct);
        return res.DeletedCount > 0;
    }

    public async Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default) =>
        await _collection.DeleteManyAsync(
            x => x.EventId == eventId && x.MovieId == movieId,
            cancellationToken: ct);

    public async Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default) =>
        await _collection.DeleteManyAsync(
            x => x.EventId == eventId && x.ParticipantId == participantId,
            cancellationToken: ct);

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;

        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<IReadOnlyDictionary<string, SeenMarkAggregate>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return new Dictionary<string, SeenMarkAggregate>();

        if (!ObjectId.TryParse(eventId, out var eventOid))
            return new Dictionary<string, SeenMarkAggregate>();

        var movieOids = new List<ObjectId>();
        foreach (var id in movieIds)
        {
            if (ObjectId.TryParse(id, out var m))
                movieOids.Add(m);
        }

        if (movieOids.Count == 0)
            return new Dictionary<string, SeenMarkAggregate>();

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
                    { "_id", "$movieId" },
                    { "count", new BsonDocument("$sum", 1) },
                    { "participantIds", new BsonDocument("$push", "$participantId") }
                })
        };

        using var cursor = await _collection.AggregateAsync<BsonDocument>(pipeline, cancellationToken: ct);
        var results = await cursor.ToListAsync(ct);
        var byMovie = new Dictionary<string, SeenMarkAggregate>();

        foreach (var r in results)
        {
            var movieIdStr = r["_id"].AsObjectId.ToString();
            var count = r["count"].ToInt32();
            var pids = r["participantIds"].AsBsonArray.Select(v => v.AsObjectId.ToString()).Distinct().ToList();
            byMovie[movieIdStr] = new SeenMarkAggregate(count, pids);
        }

        return byMovie;
    }

    public async Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return 0;

        var ids = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return 0;

        var filter = Builders<SeenMarkDocument>.Filter.In(x => x.ParticipantId, ids);
        var c = await _collection.CountDocumentsAsync(filter, cancellationToken: ct);
        return (int)c;
    }

    public async Task<IReadOnlyList<SeenMark>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        if (participantIds.Count == 0)
            return [];

        var ids = participantIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var filter = Builders<SeenMarkDocument>.Filter.In(x => x.ParticipantId, ids);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(SeenMarkMapper.ToDomain);
    }
}

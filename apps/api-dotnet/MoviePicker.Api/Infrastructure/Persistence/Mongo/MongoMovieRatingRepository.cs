using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoMovieRatingRepository : IMovieRatingRepository
{
    private readonly TransactionalCollection<MovieRatingDocument> _collection;

    public MongoMovieRatingRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<MovieRatingDocument>("movie_ratings");
    }

    private static FilterDefinition<MovieRatingDocument> OwnFilter(string eventId, string movieId, string participantId) =>
        Builders<MovieRatingDocument>.Filter.And(
            Builders<MovieRatingDocument>.Filter.Eq(x => x.EventId, eventId),
            Builders<MovieRatingDocument>.Filter.Eq(x => x.MovieId, movieId),
            Builders<MovieRatingDocument>.Filter.Eq(x => x.ParticipantId, participantId));

    public async Task<MovieRating> UpsertAsync(MovieRating rating, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var update = Builders<MovieRatingDocument>.Update
            .Set(x => x.Value, rating.Value)
            .Set(x => x.UpdatedAt, now)
            .SetOnInsert(x => x.Id, ObjectId.GenerateNewId().ToString())
            .SetOnInsert(x => x.EventId, rating.EventId)
            .SetOnInsert(x => x.MovieId, rating.MovieId)
            .SetOnInsert(x => x.ParticipantId, rating.ParticipantId)
            .SetOnInsert(x => x.CreatedAt, now);
        var options = new FindOneAndUpdateOptions<MovieRatingDocument>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };
        var doc = await _collection.FindOneAndUpdateAsync(
            OwnFilter(rating.EventId, rating.MovieId, rating.ParticipantId),
            update,
            options,
            ct);
        return MovieRatingMapper.ToDomain(doc);
    }

    public async Task<bool> DeleteAsync(string eventId, string movieId, string participantId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(movieId, out _) || !ObjectId.TryParse(participantId, out _))
            return false;
        var res = await _collection.DeleteOneAsync(OwnFilter(eventId, movieId, participantId), ct);
        return res.DeletedCount > 0;
    }

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<IReadOnlyList<MovieRating>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(eventId, out _))
            return [];
        var docs = await _collection.Find(x => x.EventId == eventId).SortBy(x => x.CreatedAt).ToListAsync(ct);
        return docs.ConvertAll(MovieRatingMapper.ToDomain);
    }

    public async Task<IReadOnlyList<MovieRating>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default)
    {
        var ids = participantIds.Where(id => ObjectId.TryParse(id, out _)).Distinct().ToList();
        if (ids.Count == 0)
            return [];
        var filter = Builders<MovieRatingDocument>.Filter.In(x => x.ParticipantId, ids);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(MovieRatingMapper.ToDomain);
    }
}

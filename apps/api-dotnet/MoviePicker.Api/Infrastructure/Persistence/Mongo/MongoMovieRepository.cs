using System.Linq;
using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoMovieRepository : IMovieRepository
{
    private readonly IMongoCollection<MovieDocument> _collection;

    public MongoMovieRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<MovieDocument>("movies");
    }

    public async Task<Movie?> GetByIdAsync(string movieId, CancellationToken ct = default)
    {
        var doc = await _collection.Find(x => x.Id == movieId).FirstOrDefaultAsync(ct);
        return doc is null ? null : MovieMapper.ToDomain(doc);
    }

    public async Task<Movie?> GetByIdAndEventIdAsync(string movieId, string eventId, CancellationToken ct = default)
    {
        var doc = await _collection.Find(x => x.Id == movieId && x.EventId == eventId).FirstOrDefaultAsync(ct);
        return doc is null ? null : MovieMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<Movie>> ListByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var list = await _collection.Find(x => x.EventId == eventId).ToListAsync(ct);
        return list.ConvertAll(MovieMapper.ToDomain);
    }

    public async Task<bool> ExistsByEventAndTmdbIdAsync(string eventId, int tmdbId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(x => x.EventId == eventId && x.TmdbId == tmdbId, cancellationToken: ct);
        return count > 0;
    }

    public async Task<bool> ExistsByEventAndTitleCaseInsensitiveAsync(string eventId, string title, CancellationToken ct = default)
    {
        var escaped = Regex.Escape(title);
        var filter = Builders<MovieDocument>.Filter.And(
            Builders<MovieDocument>.Filter.Eq(x => x.EventId, eventId),
            Builders<MovieDocument>.Filter.Regex(x => x.Title, new BsonRegularExpression($"^{escaped}$", "i")));
        var count = await _collection.CountDocumentsAsync(filter, cancellationToken: ct);
        return count > 0;
    }

    public async Task<int> CountByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.EventId == eventId && x.ParticipantId == participantId,
            cancellationToken: ct);
        return (int)count;
    }

    public async Task<Movie> InsertAsync(Movie movie, CancellationToken ct = default)
    {
        var doc = MovieMapper.ToDocument(movie);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return MovieMapper.ToDomain(doc);
    }

    public async Task DeleteAsync(string movieId, CancellationToken ct = default)
    {
        await _collection.DeleteOneAsync(x => x.Id == movieId, cancellationToken: ct);
    }

    public async Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        var c = await _collection.CountDocumentsAsync(x => x.EventId == eventId, cancellationToken: ct);
        return (int)c;
    }

    public async Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(
        IReadOnlyCollection<string> eventIds,
        CancellationToken ct = default)
    {
        if (eventIds.Count == 0)
            return new Dictionary<string, int>();

        var filter = Builders<MovieDocument>.Filter.In(x => x.EventId, eventIds);
        var groups = await _collection.Aggregate()
            .Match(filter)
            .Group(doc => doc.EventId, g => new { EventId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var map = eventIds.Distinct().ToDictionary(id => id, _ => 0);
        foreach (var row in groups)
            map[row.EventId] = row.Count;
        return map;
    }
}

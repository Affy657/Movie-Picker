using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoWatchlistRepository : IWatchlistRepository
{
    private readonly IMongoCollection<WatchlistItemDocument> _collection;

    public MongoWatchlistRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<WatchlistItemDocument>("watchlist");
    }

    public async Task<IReadOnlyList<WatchlistItem>> ListByUserIdAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public async Task<WatchlistItem?> GetOneAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var mediaTypeValue = MovieMapper.MediaTypeToString(mediaType);
        var doc = await _collection
            .Find(x => x.UserId == userId && x.TmdbId == tmdbId && x.MediaType == mediaTypeValue)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    public async Task<bool> AddAsync(WatchlistItem item, CancellationToken ct = default)
    {
        var doc = new WatchlistItemDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = item.UserId,
            TmdbId = item.TmdbId,
            MediaType = MovieMapper.MediaTypeToString(item.MediaType),
            Title = item.Title,
            Year = item.Year,
            PosterPath = item.PosterPath,
            VoteAverage = item.VoteAverage,
            RuntimeMinutes = item.RuntimeMinutes,
            LetterboxdSlug = item.LetterboxdSlug,
            CreatedAt = item.CreatedAt == default ? DateTime.UtcNow : item.CreatedAt.UtcDateTime
        };
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
            return true;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

    public async Task<bool> RemoveAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var mediaTypeValue = MovieMapper.MediaTypeToString(mediaType);
        var res = await _collection.DeleteOneAsync(
            x => x.UserId == userId && x.TmdbId == tmdbId && x.MediaType == mediaTypeValue, ct);
        return res.IsAcknowledged && res.DeletedCount > 0;
    }

    public async Task<bool> SetLetterboxdSlugAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        string slug,
        CancellationToken ct = default)
    {
        var mediaTypeValue = MovieMapper.MediaTypeToString(mediaType);
        var res = await _collection.UpdateOneAsync(
            x => x.UserId == userId && x.TmdbId == tmdbId && x.MediaType == mediaTypeValue,
            Builders<WatchlistItemDocument>.Update.Set(x => x.LetterboxdSlug, slug),
            cancellationToken: ct);
        return res.IsAcknowledged && res.MatchedCount > 0;
    }

    public async Task<long> RemoveForUsersAsync(IReadOnlyCollection<string> userIds, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        if (userIds.Count == 0)
            return 0;
        var mediaTypeValue = MovieMapper.MediaTypeToString(mediaType);
        var filter = Builders<WatchlistItemDocument>.Filter.And(
            Builders<WatchlistItemDocument>.Filter.In(x => x.UserId, userIds),
            Builders<WatchlistItemDocument>.Filter.Eq(x => x.TmdbId, tmdbId),
            Builders<WatchlistItemDocument>.Filter.Eq(x => x.MediaType, mediaTypeValue));
        var res = await _collection.DeleteManyAsync(filter, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> DeleteAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.UserId == userId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    private static WatchlistItem ToDomain(WatchlistItemDocument d) => new()
    {
        Id = d.Id,
        UserId = d.UserId,
        TmdbId = d.TmdbId,
        MediaType = MovieMapper.ParseMediaType(d.MediaType),
        Title = d.Title,
        Year = d.Year,
        PosterPath = d.PosterPath,
        VoteAverage = d.VoteAverage,
        RuntimeMinutes = d.RuntimeMinutes,
        LetterboxdSlug = d.LetterboxdSlug,
        CreatedAt = new DateTimeOffset(d.CreatedAt, TimeSpan.Zero)
    };
}

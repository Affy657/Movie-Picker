using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoWatchedTitleRepository : IWatchedTitleRepository
{
    public const string CollectionName = "watched_titles";

    public const string OwnerTitleIndexName = "watched_titles_ownerId_tmdbId_mediaType_unique";

    private const string ManualOrigin = "manual";
    private const string LetterboxdOrigin = "letterboxd";

    private static readonly FilterDefinitionBuilder<WatchedTitleDocument> Filter = Builders<WatchedTitleDocument>.Filter;
    private static readonly UpdateDefinitionBuilder<WatchedTitleDocument> Update = Builders<WatchedTitleDocument>.Update;

    private readonly TransactionalCollection<WatchedTitleDocument> _collection;

    public MongoWatchedTitleRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<WatchedTitleDocument>(CollectionName);
    }

    public async Task<IReadOnlyList<WatchedTitle>> ListByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(Filter.Eq(x => x.OwnerId, ownerId))
            .SortByDescending(x => x.WatchedAt)
            .ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public async Task<IReadOnlyList<MovieListTitle>> ListTitlesByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var rows = await _collection
            .Find(Filter.Eq(x => x.OwnerId, ownerId))
            .Project(x => new { x.TmdbId, x.MediaType })
            .ToListAsync(ct);
        return rows.ConvertAll(row => new MovieListTitle(row.TmdbId, MovieMapper.ParseMediaType(row.MediaType)));
    }

    public async Task<WatchedTitle?> GetAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var doc = await _collection.Find(SameTitle(ownerId, tmdbId, mediaType)).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    public async Task<WatchedTitle> AddIfAbsentAsync(WatchedTitle title, CancellationToken ct = default)
    {
        var doc = ToDocument(title);
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
            return ToDomain(doc);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return await GetAsync(title.OwnerId, title.TmdbId, title.MediaType, ct) ?? throw Errors.ConcurrentUpdate();
        }
    }

    public async Task<WatchedTitle?> SetRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        var doc = await _collection.FindOneAndUpdateAsync(
            SameTitle(ownerId, tmdbId, mediaType),
            Rated(rating, WatchedOrigin.Manual, updatedAt),
            new FindOneAndUpdateOptions<WatchedTitleDocument> { ReturnDocument = ReturnDocument.After },
            ct);
        return doc is null ? null : ToDomain(doc);
    }

    public async Task<bool> ApplyLetterboxdRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        var letterboxdMayRate = Filter.Or(
            Filter.Eq(x => x.Rating, null),
            Filter.Eq(x => x.RatingOrigin, LetterboxdOrigin));
        var result = await _collection.UpdateOneAsync(
            SameTitle(ownerId, tmdbId, mediaType) & letterboxdMayRate,
            Rated(rating, WatchedOrigin.Letterboxd, updatedAt),
            cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<bool> LinkLetterboxdAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        string slug,
        CancellationToken ct = default)
    {
        var result = await _collection.UpdateOneAsync(
            SameTitle(ownerId, tmdbId, mediaType),
            Update.Set(x => x.LetterboxdSlug, slug),
            cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<long> RemoveFromLetterboxdAsync(string ownerId, IReadOnlyCollection<string> ids, CancellationToken ct = default)
    {
        var validIds = ids.Where(MongoObjectIds.IsValid).Distinct(StringComparer.Ordinal).ToList();
        if (validIds.Count == 0)
            return 0;

        var result = await _collection.DeleteManyAsync(
            Filter.In(x => x.Id, validIds)
            & Filter.Eq(x => x.OwnerId, ownerId)
            & Filter.Eq(x => x.Origin, LetterboxdOrigin),
            ct);
        return result.DeletedCount;
    }

    public Task<long> CountFromLetterboxdAsync(string ownerId, CancellationToken ct = default) =>
        _collection.CountDocumentsAsync(
            Filter.Eq(x => x.OwnerId, ownerId) & Filter.Eq(x => x.Origin, LetterboxdOrigin),
            cancellationToken: ct);

    private static UpdateDefinition<WatchedTitleDocument> Rated(int? rating, WatchedOrigin origin, DateTimeOffset updatedAt)
    {
        var rated = rating is null
            ? Update.Unset(x => x.Rating).Unset(x => x.RatingOrigin)
            : Update.Set(x => x.Rating, rating).Set(x => x.RatingOrigin, OriginToString(origin));
        return rated.Set(x => x.UpdatedAt, updatedAt.UtcDateTime);
    }

    public async Task<bool> RemoveAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var result = await _collection.DeleteOneAsync(SameTitle(ownerId, tmdbId, mediaType), ct);
        return result.DeletedCount > 0;
    }

    public async Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var result = await _collection.DeleteManyAsync(Filter.Eq(x => x.OwnerId, ownerId), ct);
        return result.DeletedCount;
    }

    private static FilterDefinition<WatchedTitleDocument> SameTitle(string ownerId, int tmdbId, MovieMediaType mediaType) =>
        Filter.Eq(x => x.OwnerId, ownerId)
        & Filter.Eq(x => x.TmdbId, tmdbId)
        & Filter.Eq(x => x.MediaType, MovieMapper.MediaTypeToString(mediaType));

    private static DateTimeOffset AsUtc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static string OriginToString(WatchedOrigin origin) =>
        origin == WatchedOrigin.Letterboxd ? LetterboxdOrigin : ManualOrigin;

    private static WatchedOrigin? ParseOrigin(string? stored) => stored switch
    {
        LetterboxdOrigin => WatchedOrigin.Letterboxd,
        ManualOrigin => WatchedOrigin.Manual,
        _ => null
    };

    private static WatchedTitleDocument ToDocument(WatchedTitle title) => new()
    {
        Id = ObjectId.GenerateNewId().ToString(),
        OwnerId = title.OwnerId,
        TmdbId = title.TmdbId,
        MediaType = MovieMapper.MediaTypeToString(title.MediaType),
        Title = title.Title,
        Year = title.Year,
        PosterPath = title.PosterPath,
        VoteAverage = title.VoteAverage,
        RuntimeMinutes = title.RuntimeMinutes,
        GenreIds = title.GenreIds.Count > 0 ? [.. title.GenreIds] : null,
        WatchedAt = title.WatchedAt.UtcDateTime,
        Rating = title.Rating,
        RatingOrigin = title.Rating is not null && title.RatingOrigin is { } ratingOrigin ? OriginToString(ratingOrigin) : null,
        Origin = OriginToString(title.Origin),
        LetterboxdSlug = title.LetterboxdSlug,
        CreatedAt = title.CreatedAt.UtcDateTime,
        UpdatedAt = title.UpdatedAt.UtcDateTime
    };

    private static WatchedTitle ToDomain(WatchedTitleDocument doc) => new()
    {
        Id = doc.Id,
        OwnerId = doc.OwnerId,
        TmdbId = doc.TmdbId,
        MediaType = MovieMapper.ParseMediaType(doc.MediaType),
        Title = doc.Title,
        Year = doc.Year,
        PosterPath = doc.PosterPath,
        VoteAverage = doc.VoteAverage,
        RuntimeMinutes = doc.RuntimeMinutes,
        GenreIds = doc.GenreIds is { Count: > 0 } ? [.. doc.GenreIds] : [],
        WatchedAt = AsUtc(doc.WatchedAt),
        Rating = doc.Rating,
        RatingOrigin = doc.Rating is null ? null : ParseOrigin(doc.RatingOrigin),
        Origin = ParseOrigin(doc.Origin) ?? WatchedOrigin.Manual,
        LetterboxdSlug = doc.LetterboxdSlug,
        CreatedAt = AsUtc(doc.CreatedAt),
        UpdatedAt = AsUtc(doc.UpdatedAt)
    };
}

using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoSavedListRepository : ISavedListRepository
{
    public const string CollectionName = "saved_lists";

    public const string OwnerSourceIndexName = "saved_lists_ownerId_sourceType_sourceId_unique";

    public const string SourceOwnerIndexName = "saved_lists_sourceOwnerId";

    private static readonly Dictionary<string, ListSourceType> SourceTypes = ListSourceNames.TypesByName(StringComparer.Ordinal);

    private static readonly FilterDefinitionBuilder<SavedListDocument> Filter = Builders<SavedListDocument>.Filter;
    private static readonly UpdateDefinitionBuilder<SavedListDocument> Update = Builders<SavedListDocument>.Update;

    private readonly TransactionalCollection<SavedListDocument> _collection;

    public MongoSavedListRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<SavedListDocument>(CollectionName);
    }

    public async Task<IReadOnlyList<SavedList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(Filter.Eq(x => x.OwnerId, ownerId))
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public async Task<SavedList?> GetAsync(string ownerId, string savedListId, CancellationToken ct = default)
    {
        if (Owned(ownerId, savedListId) is not { } filter)
            return null;

        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    public async Task<SavedList?> FindBySourceAsync(string ownerId, ListSource source, CancellationToken ct = default)
    {
        var doc = await _collection.Find(SameSource(ownerId, source)).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        _collection.CountDocumentsAsync(Filter.Eq(x => x.OwnerId, ownerId), cancellationToken: ct);

    public async Task<SavedList> AddIfAbsentAsync(SavedList list, CancellationToken ct = default)
    {
        var doc = new SavedListDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OwnerId = list.OwnerId,
            SourceType = ListSourceNames.Of(list.SourceType),
            SourceId = list.SourceId,
            SourceOwnerId = list.SourceOwnerId,
            Name = list.Name,
            CreatedAt = list.CreatedAt.UtcDateTime,
            Snapshot = ToDocument(list.Snapshot)
        };
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
            return ToDomain(doc);
        }
        catch (MongoWriteException ex) when (IsSourceCollision(ex))
        {
            return await FindBySourceAsync(list.OwnerId, list.Source, ct) ?? throw Errors.ConcurrentUpdate();
        }
    }

    public async Task<bool> RefreshSnapshotAsync(
        string ownerId,
        string savedListId,
        string? sourceOwnerId,
        string name,
        IReadOnlyList<SavedListTitle> snapshot,
        CancellationToken ct = default)
    {
        if (Owned(ownerId, savedListId) is not { } owned
            || (sourceOwnerId is not null && !MongoObjectIds.IsValid(sourceOwnerId)))
            return false;

        var stillFollowed = owned & Filter.Eq(x => x.SourceOwnerId, sourceOwnerId);
        var update = Update.Set(x => x.Name, name).Set(x => x.Snapshot, ToDocument(snapshot));
        var result = await _collection.UpdateOneAsync(stillFollowed, update, cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<long> ForgetListsOfCreatorAsync(string creatorId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(creatorId))
            return 0;

        var update = Update
            .Set(x => x.Name, string.Empty)
            .Unset(x => x.Snapshot)
            .Unset(x => x.SourceOwnerId);
        var result = await _collection.UpdateManyAsync(Filter.Eq(x => x.SourceOwnerId, creatorId), update, cancellationToken: ct);
        return result.ModifiedCount;
    }

    public async Task<bool> DeleteAsync(string ownerId, string savedListId, CancellationToken ct = default)
    {
        if (Owned(ownerId, savedListId) is not { } filter)
            return false;

        var result = await _collection.DeleteOneAsync(filter, ct);
        return result.DeletedCount > 0;
    }

    public async Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var result = await _collection.DeleteManyAsync(Filter.Eq(x => x.OwnerId, ownerId), ct);
        return result.DeletedCount;
    }

    private static FilterDefinition<SavedListDocument>? Owned(string ownerId, string savedListId) =>
        MongoObjectIds.IsValid(savedListId)
            ? Filter.Eq(x => x.Id, savedListId) & Filter.Eq(x => x.OwnerId, ownerId)
            : null;

    private static FilterDefinition<SavedListDocument> SameSource(string ownerId, ListSource source) =>
        Filter.Eq(x => x.OwnerId, ownerId)
        & Filter.Eq(x => x.SourceType, ListSourceNames.Of(source.Type))
        & Filter.Eq(x => x.SourceId, source.Id);

    private static bool IsSourceCollision(MongoWriteException ex) =>
        ex.WriteError?.Category == ServerErrorCategory.DuplicateKey
        && (ex.WriteError.Message ?? string.Empty).Contains(OwnerSourceIndexName, StringComparison.Ordinal);

    private static ListSourceType ParseSourceType(string stored) =>
        SourceTypes.TryGetValue(stored, out var type)
            ? type
            : throw new InvalidOperationException($"Unknown stored list source type \"{stored}\"");

    private static SavedList ToDomain(SavedListDocument doc) => new()
    {
        Id = doc.Id,
        OwnerId = doc.OwnerId,
        SourceType = ParseSourceType(doc.SourceType),
        SourceId = doc.SourceId,
        SourceOwnerId = doc.SourceOwnerId,
        Name = doc.Name,
        CreatedAt = new DateTimeOffset(DateTime.SpecifyKind(doc.CreatedAt, DateTimeKind.Utc)),
        Snapshot = (doc.Snapshot ?? []).ConvertAll(title => new SavedListTitle
        {
            TmdbId = title.TmdbId,
            MediaType = MovieMapper.ParseMediaType(title.MediaType),
            Title = title.Title,
            Year = title.Year,
            PosterPath = title.PosterPath,
            VoteAverage = title.VoteAverage,
            RuntimeMinutes = title.RuntimeMinutes,
            GenreIds = title.GenreIds is { Count: > 0 } ? [.. title.GenreIds] : []
        })
    };

    private static List<SavedListTitleDocument>? ToDocument(IReadOnlyList<SavedListTitle> snapshot) =>
        snapshot.Count == 0
            ? null
            : [.. snapshot.Select(title => new SavedListTitleDocument
            {
                TmdbId = title.TmdbId,
                MediaType = MovieMapper.MediaTypeToString(title.MediaType),
                Title = title.Title,
                Year = title.Year,
                PosterPath = title.PosterPath,
                VoteAverage = title.VoteAverage,
                RuntimeMinutes = title.RuntimeMinutes,
                GenreIds = title.GenreIds.Count > 0 ? [.. title.GenreIds] : null
            })];
}

using System.Linq.Expressions;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoMovieListRepository : IMovieListRepository
{
    public const string CollectionName = "movie_lists";

    public const string OwnerNameIndexName = "movie_lists_ownerId_normalizedName_unique";

    public const string MemberIndexName = "movie_lists_members_userId";

    public const string InvitationIndexName = "movie_lists_invitations_userId";

    public const string InviteTokenIndexName = "movie_lists_inviteLink_token_unique";

    private const string OwnerIdField = "ownerId";
    private const string MemberUserIdField = "members.userId";
    private const string InvitationUserIdField = "invitations.userId";
    private const string InviteTokenField = "inviteLink.token";
    private const string ItemAuthorField = "items.addedByUserId";
    private const string AuthoredItem = "authored";
    private const string FilterOperator = "$filter";
    private const string InputField = "input";
    private const string IfNullOperator = "$ifNull";

    private static readonly FilterDefinitionBuilder<MovieListDocument> Filter = Builders<MovieListDocument>.Filter;
    private static readonly UpdateDefinitionBuilder<MovieListDocument> Update = Builders<MovieListDocument>.Update;

    private readonly TransactionalCollection<MovieListDocument> _collection;

    public MongoMovieListRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<MovieListDocument>(CollectionName);
    }

    public Task<IReadOnlyList<MovieListSummary>> ListSummariesAsync(string userId, CancellationToken ct = default)
    {
        var user = ObjectId.Parse(userId);
        var admitting = new BsonDocument("$or", new BsonArray
        {
            new BsonDocument(OwnerIdField, user),
            new BsonDocument(MemberUserIdField, user)
        });
        return SummariesAsync(admitting, ct);
    }

    public Task<IReadOnlyList<MovieListSummary>> ListPublicSummariesAsync(string ownerId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(ownerId)
            ? SummariesAsync(new BsonDocument { { OwnerIdField, ObjectId.Parse(ownerId) }, { "isPublic", true } }, ct)
            : Task.FromResult<IReadOnlyList<MovieListSummary>>([]);

    public Task<IReadOnlyList<MovieListSummary>> SearchPublicSummariesAsync(string query, int limit, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length == 0 || limit <= 0)
            return Task.FromResult<IReadOnlyList<MovieListSummary>>([]);

        var match = new BsonDocument
        {
            { "isPublic", true },
            { "name", NameMatching(normalized) }
        };
        return SummariesAsync(match, ct, limit);
    }

    public Task<IReadOnlyList<MovieListSummary>> SearchSummariesAsync(string userId, string query, int limit, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length == 0 || limit <= 0 || !MongoObjectIds.IsValid(userId))
            return Task.FromResult<IReadOnlyList<MovieListSummary>>([]);

        var user = ObjectId.Parse(userId);
        var match = new BsonDocument
        {
            { "$or", new BsonArray { new BsonDocument(OwnerIdField, user), new BsonDocument(MemberUserIdField, user) } },
            { "name", NameMatching(normalized) }
        };
        return SummariesAsync(match, ct, limit);
    }

    private static BsonRegularExpression NameMatching(string normalized) =>
        new(UserSearchPolicy.ToRegexPattern(normalized), "i");

    public Task<long> CountPublicByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(ownerId)
            ? _collection.CountDocumentsAsync(Filter.Eq(x => x.OwnerId, ownerId) & Filter.Eq(x => x.IsPublic, true), cancellationToken: ct)
            : Task.FromResult(0L);

    private async Task<IReadOnlyList<MovieListSummary>> SummariesAsync(BsonDocument match, CancellationToken ct, int? limit = null)
    {
        List<BsonDocument> stages =
        [
            new("$match", match),
            new("$sort", new BsonDocument("updatedAt", -1)),
        ];
        if (limit is { } max)
            stages.Add(new BsonDocument("$limit", max));
        stages.Add(new BsonDocument("$project", new BsonDocument
            {
                { OwnerIdField, 1 },
                { "name", 1 },
                { "description", 1 },
                { "isPublic", new BsonDocument("$eq", new BsonArray { "$isPublic", true }) },
                { "createdAt", 1 },
                { "updatedAt", 1 },
                { "itemCount", new BsonDocument("$size", "$items") },
                { "posterPaths", RecentPostersExpression() },
                { "titles", TitlesExpression() },
                { "memberCount", new BsonDocument("$add", new BsonArray { 1, SizeOf("members") }) },
                { "previewMemberIds", PreviewMemberIdsExpression() }
            }));
        using var cursor = await _collection.AggregateAsync(
            PipelineDefinition<MovieListDocument, MovieListSummaryRow>.Create(stages),
            cancellationToken: ct);
        var rows = await cursor.ToListAsync(ct);
        return rows.ConvertAll(row => new MovieListSummary(
            row.Id,
            row.OwnerId,
            row.Name,
            row.Description,
            row.IsPublic,
            row.ItemCount,
            row.PosterPaths,
            AsUtc(row.CreatedAt),
            AsUtc(row.UpdatedAt),
            row.Titles.ConvertAll(title => new MovieListTitle(title.TmdbId, MovieMapper.ParseMediaType(title.MediaType))),
            row.MemberCount,
            row.PreviewMemberIds));
    }

    public Task<IReadOnlyList<MovieList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        ListAsync(Filter.Eq(x => x.OwnerId, ownerId), ct);

    public Task<IReadOnlyList<MovieList>> ListJoinedAsync(string userId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(userId)
            ? ListAsync(Filter.Eq(MemberUserIdField, ObjectId.Parse(userId)), ct)
            : Task.FromResult<IReadOnlyList<MovieList>>([]);

    public Task<IReadOnlyList<MovieList>> ListInvitingAsync(string userId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(userId)
            ? ListAsync(Filter.Eq(InvitationUserIdField, ObjectId.Parse(userId)), ct)
            : Task.FromResult<IReadOnlyList<MovieList>>([]);

    public async Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> listIds,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        var validIds = listIds.Where(MongoObjectIds.IsValid).Distinct(StringComparer.Ordinal).ToList();
        if (validIds.Count == 0 || !MongoObjectIds.IsValid(userId))
            return new HashSet<string>(StringComparer.Ordinal);

        var filter = Filter.In(x => x.Id, validIds) & PendingInvitationOf(ObjectId.Parse(userId), now);
        var ids = await _collection.Find(filter).Project(x => x.Id).ToListAsync(ct);
        return ids.ToHashSet(StringComparer.Ordinal);
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        _collection.CountDocumentsAsync(Filter.Eq(x => x.OwnerId, ownerId), cancellationToken: ct);

    public async Task<bool> IsNameTakenAsync(
        string ownerId,
        string nameKey,
        string? exceptListId,
        CancellationToken ct = default)
    {
        var filter = Filter.Eq(x => x.OwnerId, ownerId) & Filter.Eq(x => x.NormalizedName, nameKey);
        if (exceptListId is not null)
            filter &= Filter.Ne(x => x.Id, exceptListId);
        return await _collection.CountDocumentsAsync(filter, new CountOptions { Limit = 1 }, ct) > 0;
    }

    public Task<MovieList?> GetAsync(string userId, string listId, CancellationToken ct = default) =>
        FindOneAsync(Admitting(userId, listId), ct);

    public Task<MovieList?> FindAsync(string listId, CancellationToken ct = default) =>
        FindOneAsync(ById(listId), ct);

    public async Task<IReadOnlyList<MovieList>> ListByIdsAsync(
        IReadOnlyCollection<string> listIds,
        CancellationToken ct = default)
    {
        var validIds = listIds.Where(MongoObjectIds.IsValid).Distinct(StringComparer.Ordinal).ToList();
        if (validIds.Count == 0)
            return [];

        var docs = await _collection.Find(Filter.In(x => x.Id, validIds)).ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public Task<MovieList?> FindByInviteTokenAsync(string token, CancellationToken ct = default) =>
        FindOneAsync(Filter.Eq(InviteTokenField, token), ct);

    public async Task<MovieList> AddAsync(MovieList list, CancellationToken ct = default)
    {
        var doc = new MovieListDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OwnerId = list.OwnerId,
            Name = list.Name,
            NormalizedName = list.NameKey,
            Description = list.Description,
            IsPublic = list.IsPublic,
            Items = [.. list.Items.Select(ToDocument)],
            Members = [.. list.Members.Select(ToDocument)],
            Invitations = [.. list.Invitations.Select(ToDocument)],
            InviteLink = list.InviteLink is { } link ? ToDocument(link) : null,
            CreatedAt = list.CreatedAt.UtcDateTime,
            UpdatedAt = list.UpdatedAt.UtcDateTime
        };
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (IsNameCollision(ex))
        {
            throw Errors.MovieListNameTaken(list.Name);
        }

        return ToDomain(doc);
    }

    public async Task<MovieList?> UpdateDetailsAsync(
        string ownerId,
        string listId,
        string name,
        string? description,
        bool isPublic,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        if (Owned(ownerId, listId) is not { } filter)
            return null;

        var update = Update
            .Set(x => x.Name, name)
            .Set(x => x.NormalizedName, MovieListName.Key(name))
            .Set(x => x.Description, description)
            .Set(x => x.IsPublic, isPublic)
            .Set(x => x.UpdatedAt, updatedAt.UtcDateTime);
        UpdateResult result;
        try
        {
            result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (IsNameCollision(ex))
        {
            throw Errors.MovieListNameTaken(name);
        }

        if (result.MatchedCount == 0)
            return null;
        return await FindOneAsync(filter, ct);
    }

    public async Task<bool> DeleteAsync(string ownerId, string listId, CancellationToken ct = default)
    {
        if (Owned(ownerId, listId) is not { } filter)
            return false;

        var result = await _collection.DeleteOneAsync(filter, ct);
        return result.DeletedCount > 0;
    }

    public async Task<bool> AddItemAsync(
        string userId,
        string listId,
        MovieListItem item,
        int maxItems,
        CancellationToken ct = default)
    {
        if (Admitting(userId, listId) is not { } admitting)
            return false;

        var filter = admitting
            & Filter.Exists($"items.{maxItems - 1}", false)
            & Filter.Not(Filter.ElemMatch(x => x.Items, SameTitle(item.TmdbId, item.MediaType)));
        var update = Update
            .Push(x => x.Items, ToDocument(item))
            .Set(x => x.UpdatedAt, item.AddedAt.UtcDateTime);
        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> RemoveItemAsync(
        string userId,
        string listId,
        MovieListTitle title,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        if (Admitting(userId, listId) is not { } admitting)
            return false;

        var sameTitle = SameTitle(title.TmdbId, title.MediaType);
        var filter = admitting & Filter.ElemMatch(x => x.Items, sameTitle);
        var update = Update
            .PullFilter(x => x.Items, sameTitle)
            .Set(x => x.UpdatedAt, updatedAt.UtcDateTime);
        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        var result = await _collection.DeleteManyAsync(Filter.Eq(x => x.OwnerId, ownerId), ct);
        return result.DeletedCount;
    }

    public Task<bool> AddInvitationAsync(
        string listId,
        MovieListInvitation invitation,
        int maxSeats,
        CancellationToken ct = default)
    {
        if (ById(listId) is not { } byId || !MongoObjectIds.IsValid(invitation.UserId))
            return Task.FromResult(false);

        var user = ObjectId.Parse(invitation.UserId);
        var filter = byId
            & Outsider(user)
            & NoPendingInvitationOf(user, invitation.InvitedAt)
            & SeatsLeft(maxSeats, invitation.InvitedAt);
        return ModifyAsync(filter, ReplacingInvitationOf(user, invitation), ct);
    }

    public Task<bool> RemoveInvitationAsync(string listId, string userId, CancellationToken ct = default)
    {
        if (ById(listId) is not { } byId || !MongoObjectIds.IsValid(userId))
            return Task.FromResult(false);

        var user = ObjectId.Parse(userId);
        return ModifyAsync(byId & Filter.Eq(InvitationUserIdField, user), PullInvitation(userId), ct);
    }

    public Task<bool> AcceptInvitationAsync(string listId, MovieListMember member, CancellationToken ct = default)
    {
        if (ById(listId) is not { } byId || !MongoObjectIds.IsValid(member.UserId))
            return Task.FromResult(false);

        var user = ObjectId.Parse(member.UserId);
        var update = Update.Combine(PullInvitation(member.UserId), Update.Push(x => x.Members, ToDocument(member)));
        return ModifyAsync(byId & PendingInvitationOf(user, member.JoinedAt), update, ct);
    }

    public Task<bool> JoinByInviteTokenAsync(
        string token,
        MovieListMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(member.UserId))
            return Task.FromResult(false);

        var user = ObjectId.Parse(member.UserId);
        var filter = Filter.Eq(InviteTokenField, token)
            & Filter.Eq("inviteLink.disabled", false)
            & Filter.Gt("inviteLink.expiresAt", now.UtcDateTime)
            & Outsider(user)
            & (PendingInvitationOf(user, now) | SeatsLeft(maxSeats, now));
        var update = Update.Combine(PullInvitation(member.UserId), Update.Push(x => x.Members, ToDocument(member)));
        return ModifyAsync(filter, update, ct);
    }

    public Task<bool> RemoveMemberAsync(string listId, string userId, bool disableInviteLink, CancellationToken ct = default)
    {
        if (ById(listId) is not { } byId || !MongoObjectIds.IsValid(userId))
            return Task.FromResult(false);

        var user = ObjectId.Parse(userId);
        return ModifyAsync(byId & Filter.Eq(MemberUserIdField, user), WithoutMember(user, disableInviteLink), ct);
    }

    public async Task<bool> SetInviteLinkAsync(
        string ownerId,
        string listId,
        MovieListInviteLink link,
        CancellationToken ct = default)
    {
        if (Owned(ownerId, listId) is not { } filter)
            return false;

        var result = await _collection.UpdateOneAsync(filter, Update.Set(x => x.InviteLink, ToDocument(link)), cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<bool> DisableInviteLinkAsync(string ownerId, string listId, CancellationToken ct = default)
    {
        if (Owned(ownerId, listId) is not { } owned)
            return false;

        var filter = owned & Filter.Exists(InviteTokenField);
        var result = await _collection.UpdateOneAsync(filter, Update.Set("inviteLink.disabled", true), cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<long> RemoveFromOthersListsAsync(string userId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(userId))
            return 0;

        var user = ObjectId.Parse(userId);
        var filter = Filter.Eq(MemberUserIdField, user) | Filter.Eq(InvitationUserIdField, user);
        var result = await _collection.UpdateManyAsync(
            filter,
            Update.Combine(PullMember(userId), PullInvitation(userId)),
            cancellationToken: ct);
        return result.ModifiedCount;
    }

    public Task<IReadOnlyList<MovieList>> ListOthersWithItemsAddedByAsync(string userId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(userId))
            return Task.FromResult<IReadOnlyList<MovieList>>([]);

        var user = ObjectId.Parse(userId);
        return ListAsync(Filter.Eq(ItemAuthorField, user) & Filter.Ne(OwnerIdField, user), ct);
    }

    public async Task<long> ForgetItemAuthorAsync(string userId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(userId))
            return 0;

        var user = ObjectId.Parse(userId);
        var authoredByTheUser = new BsonDocumentArrayFilterDefinition<BsonDocument>(
            new BsonDocument(AuthoredItem + ".addedByUserId", user));
        var result = await _collection.UpdateManyAsync(
            Filter.Eq(ItemAuthorField, user),
            Update.Unset($"items.$[{AuthoredItem}].addedByUserId"),
            new UpdateOptions { ArrayFilters = [authoredByTheUser] },
            ct);
        return result.ModifiedCount;
    }

    private async Task<IReadOnlyList<MovieList>> ListAsync(FilterDefinition<MovieListDocument> filter, CancellationToken ct)
    {
        var docs = await _collection.Find(filter).SortByDescending(x => x.UpdatedAt).ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    private async Task<MovieList?> FindOneAsync(FilterDefinition<MovieListDocument>? filter, CancellationToken ct)
    {
        if (filter is null)
            return null;

        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    private async Task<bool> ModifyAsync(
        FilterDefinition<MovieListDocument> filter,
        UpdateDefinition<MovieListDocument> update,
        CancellationToken ct)
    {
        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    private static FilterDefinition<MovieListDocument>? ById(string listId) =>
        MongoObjectIds.IsValid(listId) ? Filter.Eq(x => x.Id, listId) : null;

    private static FilterDefinition<MovieListDocument>? Owned(string ownerId, string listId) =>
        ById(listId) is { } byId && MongoObjectIds.IsValid(ownerId)
            ? byId & Filter.Eq(x => x.OwnerId, ownerId)
            : null;

    private static FilterDefinition<MovieListDocument>? Admitting(string userId, string listId)
    {
        if (ById(listId) is not { } byId || !MongoObjectIds.IsValid(userId))
            return null;

        var user = ObjectId.Parse(userId);
        return byId & (Filter.Eq(OwnerIdField, user) | Filter.Eq(MemberUserIdField, user));
    }

    private static FilterDefinition<MovieListDocument> Outsider(ObjectId user) =>
        Filter.Ne(OwnerIdField, user) & Filter.Ne(MemberUserIdField, user);

    private static FilterDefinition<MovieListDocument> SeatsLeft(int maxSeats, DateTimeOffset now) =>
        MongoMembershipExpressions.SeatsLeft(maxSeats, LatestLapsedAt(now));

    private static BsonDocument PendingInvitationMatch(ObjectId user, DateTimeOffset now) =>
        MongoMembershipExpressions.PendingInvitationMatch(user, LatestLapsedAt(now));

    private static FilterDefinition<MovieListDocument> PendingInvitationOf(ObjectId user, DateTimeOffset now) =>
        new BsonDocument("invitations", PendingInvitationMatch(user, now));

    private static FilterDefinition<MovieListDocument> NoPendingInvitationOf(ObjectId user, DateTimeOffset now) =>
        new BsonDocument("invitations", new BsonDocument("$not", PendingInvitationMatch(user, now)));

    private static BsonDateTime LatestLapsedAt(DateTimeOffset now) =>
        new(MovieListInvitation.LatestLapsedAt(now).UtcDateTime);

    private static UpdateDefinition<MovieListDocument> ReplacingInvitationOf(ObjectId user, MovieListInvitation invitation) =>
        Update.Pipeline(PipelineDefinition<MovieListDocument, MovieListDocument>.Create(
            MongoMembershipExpressions.ReplacingInvitationOf(user, ToDocument(invitation).ToBsonDocument())));

    private static BsonDocument SizeOf(string field) => MongoMembershipExpressions.SizeOf(field);

    private static UpdateDefinition<MovieListDocument> PullInvitation(string userId) =>
        Update.PullFilter(x => x.Invitations, invitation => invitation.UserId == userId);

    private static UpdateDefinition<MovieListDocument> PullMember(string userId) =>
        Update.PullFilter(x => x.Members, member => member.UserId == userId);

    private static UpdateDefinition<MovieListDocument> WithoutMember(ObjectId user, bool disableInviteLink) =>
        Update.Pipeline(PipelineDefinition<MovieListDocument, MovieListDocument>.Create(
            MongoMembershipExpressions.WithoutMember(user, disableInviteLink)));

    private static bool IsNameCollision(MongoWriteException ex) =>
        ex.WriteError?.Category == ServerErrorCategory.DuplicateKey
        && (ex.WriteError.Message ?? string.Empty).Contains(OwnerNameIndexName, StringComparison.Ordinal);

    private static Expression<Func<MovieListItemDocument, bool>> SameTitle(int tmdbId, MovieMediaType mediaType)
    {
        var mediaTypeValue = MovieMapper.MediaTypeToString(mediaType);
        return entry => entry.TmdbId == tmdbId && entry.MediaType == mediaTypeValue;
    }

    private static BsonDocument PreviewMemberIdsExpression() =>
        new("$concatArrays", new BsonArray
        {
            new BsonArray { "$ownerId" },
            new BsonDocument("$slice", new BsonArray
            {
                new BsonDocument(IfNullOperator, new BsonArray { "$members.userId", new BsonArray() }),
                MovieList.MemberPreviewCount - 1
            })
        });

    private static BsonDocument RecentPostersExpression()
    {
        var withPoster = new BsonDocument(FilterOperator, new BsonDocument
        {
            { InputField, "$items.posterPath" },
            { "as", "poster" },
            { "cond", new BsonDocument("$gt", new BsonArray { "$$poster", string.Empty }) }
        });
        return new BsonDocument("$slice", new BsonArray
        {
            new BsonDocument("$reverseArray", withPoster),
            MovieList.SummaryPosterCount
        });
    }

    private static BsonDocument TitlesExpression() =>
        new("$map", new BsonDocument
        {
            { InputField, "$items" },
            { "as", "item" },
            { "in", new BsonDocument { { "tmdbId", "$$item.tmdbId" }, { "mediaType", "$$item.mediaType" } } }
        });

    private static DateTimeOffset AsUtc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static MovieListItemDocument ToDocument(MovieListItem item) => new()
    {
        Title = item.Title,
        Year = item.Year,
        TmdbId = item.TmdbId,
        MediaType = MovieMapper.MediaTypeToString(item.MediaType),
        AddedAt = item.AddedAt.UtcDateTime,
        PosterPath = item.PosterPath,
        GenreIds = item.GenreIds.Count > 0 ? [.. item.GenreIds] : null,
        RuntimeMinutes = item.RuntimeMinutes,
        VoteAverage = item.VoteAverage,
        AddedByUserId = string.IsNullOrEmpty(item.AddedByUserId) ? null : item.AddedByUserId
    };

    private static MovieListMemberDocument ToDocument(MovieListMember member) =>
        new() { UserId = member.UserId, JoinedAt = member.JoinedAt.UtcDateTime };

    private static MovieListInvitationDocument ToDocument(MovieListInvitation invitation) =>
        new() { UserId = invitation.UserId, InvitedAt = invitation.InvitedAt.UtcDateTime };

    private static MovieListInviteLinkDocument ToDocument(MovieListInviteLink link) =>
        new() { Token = link.Token, ExpiresAt = link.ExpiresAt.UtcDateTime, Disabled = link.Disabled };

    private static MovieList ToDomain(MovieListDocument doc) => new()
    {
        Id = doc.Id,
        OwnerId = doc.OwnerId,
        Name = doc.Name,
        Description = doc.Description,
        IsPublic = doc.IsPublic,
        Items = doc.Items.ConvertAll(entry => new MovieListItem
        {
            TmdbId = entry.TmdbId,
            MediaType = MovieMapper.ParseMediaType(entry.MediaType),
            Title = entry.Title,
            Year = entry.Year,
            PosterPath = entry.PosterPath,
            VoteAverage = entry.VoteAverage,
            RuntimeMinutes = entry.RuntimeMinutes,
            GenreIds = entry.GenreIds is { Count: > 0 } ? [.. entry.GenreIds] : [],
            AddedAt = AsUtc(entry.AddedAt),
            AddedByUserId = entry.AddedByUserId
        }),
        Members = (doc.Members ?? []).ConvertAll(member => new MovieListMember(member.UserId, AsUtc(member.JoinedAt))),
        Invitations = (doc.Invitations ?? []).ConvertAll(invitation =>
            new MovieListInvitation(invitation.UserId, AsUtc(invitation.InvitedAt))),
        InviteLink = doc.InviteLink is { } link
            ? new MovieListInviteLink(link.Token, AsUtc(link.ExpiresAt), link.Disabled)
            : null,
        CreatedAt = AsUtc(doc.CreatedAt),
        UpdatedAt = AsUtc(doc.UpdatedAt)
    };
}

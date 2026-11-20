using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoFriendGroupRepository : IFriendGroupRepository
{
    public const string CollectionName = "friend_groups";

    public const string OwnerIndexName = "friend_groups_ownerId";

    public const string MemberIndexName = "friend_groups_members_userId";

    public const string InvitationIndexName = "friend_groups_invitations_userId";

    public const string InviteTokenIndexName = "friend_groups_inviteLink_token_unique";

    private const string OwnerIdField = "ownerId";
    private const string MemberUserIdField = "members.userId";
    private const string InvitationUserIdField = "invitations.userId";
    private const string InviteTokenField = "inviteLink.token";

    private static readonly FilterDefinitionBuilder<FriendGroupDocument> Filter = Builders<FriendGroupDocument>.Filter;
    private static readonly UpdateDefinitionBuilder<FriendGroupDocument> Update = Builders<FriendGroupDocument>.Update;

    private readonly TransactionalCollection<FriendGroupDocument> _collection;

    public MongoFriendGroupRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<FriendGroupDocument>(CollectionName);
    }

    public Task<IReadOnlyList<FriendGroup>> ListAdmittingAsync(string userId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(userId)
            ? ListAsync(OwnedOrJoinedBy(ObjectId.Parse(userId)), ct)
            : Task.FromResult<IReadOnlyList<FriendGroup>>([]);

    public Task<IReadOnlyList<FriendGroup>> ListByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(ownerId)
            ? ListAsync(Filter.Eq(x => x.OwnerId, ownerId), ct)
            : Task.FromResult<IReadOnlyList<FriendGroup>>([]);

    public Task<IReadOnlyList<FriendGroup>> ListJoinedAsync(string userId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(userId)
            ? ListAsync(Filter.Eq(MemberUserIdField, ObjectId.Parse(userId)), ct)
            : Task.FromResult<IReadOnlyList<FriendGroup>>([]);

    public Task<IReadOnlyList<FriendGroup>> ListInvitingAsync(string userId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(userId)
            ? ListAsync(Filter.Eq(InvitationUserIdField, ObjectId.Parse(userId)), ct)
            : Task.FromResult<IReadOnlyList<FriendGroup>>([]);

    public async Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        var known = groupIds.Where(MongoObjectIds.IsValid).Distinct(StringComparer.Ordinal).ToList();
        if (known.Count == 0 || !MongoObjectIds.IsValid(userId))
            return new HashSet<string>(StringComparer.Ordinal);

        var pending = Filter.In(x => x.Id, known) & PendingInvitationOf(ObjectId.Parse(userId), now);
        var ids = await _collection.Find(pending).Project(x => x.Id).ToListAsync(ct);
        return ids.ToHashSet(StringComparer.Ordinal);
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        MongoObjectIds.IsValid(ownerId)
            ? _collection.CountDocumentsAsync(Filter.Eq(x => x.OwnerId, ownerId), cancellationToken: ct)
            : Task.FromResult(0L);

    public Task<FriendGroup?> GetAsync(string userId, string groupId, CancellationToken ct = default) =>
        FindOneAsync(Admitting(userId, groupId), ct);

    public Task<FriendGroup?> FindAsync(string groupId, CancellationToken ct = default) =>
        FindOneAsync(ById(groupId), ct);

    public Task<FriendGroup?> FindByInviteTokenAsync(string token, CancellationToken ct = default) =>
        FindOneAsync(Filter.Eq(InviteTokenField, token), ct);

    public async Task<FriendGroup> AddAsync(FriendGroup group, CancellationToken ct = default)
    {
        var doc = new FriendGroupDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OwnerId = group.OwnerId,
            Name = group.Name,
            Members = [.. group.Members.Select(ToDocument)],
            Invitations = [.. group.Invitations.Select(ToDocument)],
            InviteLink = group.InviteLink is { } link ? ToDocument(link) : null,
            CreatedAt = group.CreatedAt.UtcDateTime,
            UpdatedAt = group.UpdatedAt.UtcDateTime
        };
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return ToDomain(doc);
    }

    public async Task<FriendGroup?> RenameAsync(
        string ownerId,
        string groupId,
        string name,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        if (Owned(ownerId, groupId) is not { } owned)
            return null;

        var renamed = Update.Set(x => x.Name, name).Set(x => x.UpdatedAt, updatedAt.UtcDateTime);
        var result = await _collection.UpdateOneAsync(owned, renamed, cancellationToken: ct);
        return result.MatchedCount == 0 ? null : await FindOneAsync(owned, ct);
    }

    public async Task<bool> DeleteAsync(string ownerId, string groupId, CancellationToken ct = default)
    {
        if (Owned(ownerId, groupId) is not { } owned)
            return false;

        var result = await _collection.DeleteOneAsync(owned, ct);
        return result.DeletedCount > 0;
    }

    public async Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(ownerId))
            return 0;

        var result = await _collection.DeleteManyAsync(Filter.Eq(x => x.OwnerId, ownerId), ct);
        return result.DeletedCount;
    }

    public Task<bool> AddInvitationAsync(
        string groupId,
        FriendGroupInvitation invitation,
        int maxSeats,
        CancellationToken ct = default)
    {
        if (ById(groupId) is not { } group || !MongoObjectIds.IsValid(invitation.UserId))
            return Task.FromResult(false);

        var invitee = ObjectId.Parse(invitation.UserId);
        var invitable = group
            & Outsider(invitee)
            & NoPendingInvitationOf(invitee, invitation.InvitedAt)
            & SeatsLeft(maxSeats, invitation.InvitedAt);
        var replacing = Update.Pipeline(PipelineDefinition<FriendGroupDocument, FriendGroupDocument>.Create(
            MongoMembershipExpressions.ReplacingInvitationOf(invitee, ToDocument(invitation).ToBsonDocument())));
        return ModifyAsync(invitable, replacing, ct);
    }

    public Task<bool> RemoveInvitationAsync(string groupId, string userId, CancellationToken ct = default)
    {
        if (ById(groupId) is not { } group || !MongoObjectIds.IsValid(userId))
            return Task.FromResult(false);

        return ModifyAsync(group & Filter.Eq(InvitationUserIdField, ObjectId.Parse(userId)), PullInvitation(userId), ct);
    }

    public Task<bool> AcceptInvitationAsync(string groupId, FriendGroupMember member, CancellationToken ct = default)
    {
        if (ById(groupId) is not { } group || !MongoObjectIds.IsValid(member.UserId))
            return Task.FromResult(false);

        var invited = group & PendingInvitationOf(ObjectId.Parse(member.UserId), member.JoinedAt);
        return ModifyAsync(invited, Admit(member), ct);
    }

    public Task<bool> JoinByInviteTokenAsync(
        string token,
        FriendGroupMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(member.UserId))
            return Task.FromResult(false);

        var joiner = ObjectId.Parse(member.UserId);
        var joinable = Filter.Eq(InviteTokenField, token)
            & Filter.Eq("inviteLink.disabled", false)
            & Filter.Gt("inviteLink.expiresAt", now.UtcDateTime)
            & Outsider(joiner)
            & (PendingInvitationOf(joiner, now) | SeatsLeft(maxSeats, now));
        return ModifyAsync(joinable, Admit(member), ct);
    }

    public Task<bool> RemoveMemberAsync(string groupId, string userId, bool disableInviteLink, CancellationToken ct = default)
    {
        if (ById(groupId) is not { } group || !MongoObjectIds.IsValid(userId))
            return Task.FromResult(false);

        var leaving = ObjectId.Parse(userId);
        var removal = Update.Pipeline(PipelineDefinition<FriendGroupDocument, FriendGroupDocument>.Create(
            MongoMembershipExpressions.WithoutMember(leaving, disableInviteLink)));
        return ModifyAsync(group & Filter.Eq(MemberUserIdField, leaving), removal, ct);
    }

    public async Task<bool> SetInviteLinkAsync(
        string ownerId,
        string groupId,
        FriendGroupInviteLink link,
        CancellationToken ct = default)
    {
        if (Owned(ownerId, groupId) is not { } owned)
            return false;

        var result = await _collection.UpdateOneAsync(owned, Update.Set(x => x.InviteLink, ToDocument(link)), cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<bool> DisableInviteLinkAsync(string ownerId, string groupId, CancellationToken ct = default)
    {
        if (Owned(ownerId, groupId) is not { } owned)
            return false;

        var withLink = owned & Filter.Exists(InviteTokenField);
        var result = await _collection.UpdateOneAsync(withLink, Update.Set("inviteLink.disabled", true), cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<long> RemoveFromOthersGroupsAsync(string userId, CancellationToken ct = default)
    {
        if (!MongoObjectIds.IsValid(userId))
            return 0;

        var person = ObjectId.Parse(userId);
        var holding = Filter.Eq(MemberUserIdField, person) | Filter.Eq(InvitationUserIdField, person);
        var forgetting = Update.Combine(
            Update.PullFilter(x => x.Members, member => member.UserId == userId),
            PullInvitation(userId));
        var result = await _collection.UpdateManyAsync(holding, forgetting, cancellationToken: ct);
        return result.ModifiedCount;
    }

    private async Task<IReadOnlyList<FriendGroup>> ListAsync(FilterDefinition<FriendGroupDocument> filter, CancellationToken ct)
    {
        var docs = await _collection.Find(filter).SortByDescending(x => x.UpdatedAt).ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    private async Task<FriendGroup?> FindOneAsync(FilterDefinition<FriendGroupDocument>? filter, CancellationToken ct)
    {
        if (filter is null)
            return null;

        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        return doc is null ? null : ToDomain(doc);
    }

    private async Task<bool> ModifyAsync(
        FilterDefinition<FriendGroupDocument> filter,
        UpdateDefinition<FriendGroupDocument> update,
        CancellationToken ct)
    {
        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    private static FilterDefinition<FriendGroupDocument>? ById(string groupId) =>
        MongoObjectIds.IsValid(groupId) ? Filter.Eq(x => x.Id, groupId) : null;

    private static FilterDefinition<FriendGroupDocument>? Owned(string ownerId, string groupId) =>
        ById(groupId) is { } group && MongoObjectIds.IsValid(ownerId)
            ? group & Filter.Eq(x => x.OwnerId, ownerId)
            : null;

    private static FilterDefinition<FriendGroupDocument>? Admitting(string userId, string groupId) =>
        ById(groupId) is { } group && MongoObjectIds.IsValid(userId)
            ? group & OwnedOrJoinedBy(ObjectId.Parse(userId))
            : null;

    private static FilterDefinition<FriendGroupDocument> OwnedOrJoinedBy(ObjectId user) =>
        Filter.Eq(OwnerIdField, user) | Filter.Eq(MemberUserIdField, user);

    private static FilterDefinition<FriendGroupDocument> Outsider(ObjectId user) =>
        Filter.Ne(OwnerIdField, user) & Filter.Ne(MemberUserIdField, user);

    private static FilterDefinition<FriendGroupDocument> SeatsLeft(int maxSeats, DateTimeOffset now) =>
        MongoMembershipExpressions.SeatsLeft(maxSeats, LatestLapsedAt(now));

    private static FilterDefinition<FriendGroupDocument> PendingInvitationOf(ObjectId user, DateTimeOffset now) =>
        new BsonDocument("invitations", MongoMembershipExpressions.PendingInvitationMatch(user, LatestLapsedAt(now)));

    private static FilterDefinition<FriendGroupDocument> NoPendingInvitationOf(ObjectId user, DateTimeOffset now) =>
        new BsonDocument("invitations", new BsonDocument("$not", MongoMembershipExpressions.PendingInvitationMatch(user, LatestLapsedAt(now))));

    private static BsonDateTime LatestLapsedAt(DateTimeOffset now) =>
        new(FriendGroupInvitation.LatestLapsedAt(now).UtcDateTime);

    private static UpdateDefinition<FriendGroupDocument> PullInvitation(string userId) =>
        Update.PullFilter(x => x.Invitations, invitation => invitation.UserId == userId);

    private static UpdateDefinition<FriendGroupDocument> Admit(FriendGroupMember member) =>
        Update.Combine(PullInvitation(member.UserId), Update.Push(x => x.Members, ToDocument(member)));

    private static DateTimeOffset AsUtc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static FriendGroupMemberDocument ToDocument(FriendGroupMember member) =>
        new() { UserId = member.UserId, JoinedAt = member.JoinedAt.UtcDateTime };

    private static FriendGroupInvitationDocument ToDocument(FriendGroupInvitation invitation) =>
        new() { UserId = invitation.UserId, InvitedAt = invitation.InvitedAt.UtcDateTime };

    private static FriendGroupInviteLinkDocument ToDocument(FriendGroupInviteLink link) =>
        new() { Token = link.Token, ExpiresAt = link.ExpiresAt.UtcDateTime, Disabled = link.Disabled };

    private static FriendGroup ToDomain(FriendGroupDocument doc) => new()
    {
        Id = doc.Id,
        OwnerId = doc.OwnerId,
        Name = doc.Name,
        Members = (doc.Members ?? []).ConvertAll(member => new FriendGroupMember(member.UserId, AsUtc(member.JoinedAt))),
        Invitations = (doc.Invitations ?? []).ConvertAll(invitation =>
            new FriendGroupInvitation(invitation.UserId, AsUtc(invitation.InvitedAt))),
        InviteLink = doc.InviteLink is { } link
            ? new FriendGroupInviteLink(link.Token, AsUtc(link.ExpiresAt), link.Disabled)
            : null,
        CreatedAt = AsUtc(doc.CreatedAt),
        UpdatedAt = AsUtc(doc.UpdatedAt)
    };
}

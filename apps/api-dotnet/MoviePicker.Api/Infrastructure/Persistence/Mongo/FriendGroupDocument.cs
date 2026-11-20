using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class FriendGroupDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("members")]
    public List<FriendGroupMemberDocument> Members { get; set; } = [];

    [BsonElement("invitations")]
    public List<FriendGroupInvitationDocument> Invitations { get; set; } = [];

    [BsonElement("inviteLink")]
    [BsonIgnoreIfNull]
    public FriendGroupInviteLinkDocument? InviteLink { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class FriendGroupMemberDocument
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("joinedAt")]
    public DateTime JoinedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class FriendGroupInvitationDocument
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("invitedAt")]
    public DateTime InvitedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class FriendGroupInviteLinkDocument
{
    [BsonElement("token")]
    public string Token { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("disabled")]
    public bool Disabled { get; set; }
}

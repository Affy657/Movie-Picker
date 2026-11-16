using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class MovieListDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("normalizedName")]
    public string NormalizedName { get; set; } = string.Empty;

    [BsonElement("description")]
    [BsonIgnoreIfNull]
    public string? Description { get; set; }

    [BsonElement("isPublic")]
    public bool IsPublic { get; set; }

    [BsonElement("items")]
    public List<MovieListItemDocument> Items { get; set; } = [];

    [BsonElement("members")]
    public List<MovieListMemberDocument> Members { get; set; } = [];

    [BsonElement("invitations")]
    public List<MovieListInvitationDocument> Invitations { get; set; } = [];

    [BsonElement("inviteLink")]
    [BsonIgnoreIfNull]
    public MovieListInviteLinkDocument? InviteLink { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class MovieListMemberDocument
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("joinedAt")]
    public DateTime JoinedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class MovieListInvitationDocument
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("invitedAt")]
    public DateTime InvitedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class MovieListInviteLinkDocument
{
    [BsonElement("token")]
    public string Token { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("disabled")]
    public bool Disabled { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class MovieListItemDocument
{
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("year")]
    public string Year { get; set; } = string.Empty;

    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = MovieMapper.StoredMovieMediaType;

    [BsonElement("addedAt")]
    public DateTime AddedAt { get; set; }

    [BsonElement("posterPath")]
    [BsonIgnoreIfNull]
    public string? PosterPath { get; set; }

    [BsonElement("genreIds")]
    [BsonIgnoreIfNull]
    public List<int>? GenreIds { get; set; }

    [BsonElement("runtimeMinutes")]
    [BsonIgnoreIfNull]
    public int? RuntimeMinutes { get; set; }

    [BsonElement("voteAverage")]
    [BsonIgnoreIfNull]
    public double? VoteAverage { get; set; }

    [BsonElement("addedByUserId")]
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonIgnoreIfNull]
    public string? AddedByUserId { get; set; }
}

[BsonIgnoreExtraElements]
internal sealed class MovieListSummaryRow
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("memberCount")]
    public int MemberCount { get; set; } = 1;

    [BsonElement("previewMemberIds")]
    [BsonRepresentation(BsonType.ObjectId)]
    public List<string> PreviewMemberIds { get; set; } = [];

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("isPublic")]
    public bool IsPublic { get; set; }

    [BsonElement("itemCount")]
    public int ItemCount { get; set; }

    [BsonElement("posterPaths")]
    public List<string> PosterPaths { get; set; } = [];

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [BsonElement("titles")]
    public List<MovieListTitleRow> Titles { get; set; } = [];
}

[BsonIgnoreExtraElements]
internal sealed class MovieListTitleRow
{
    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    public string? MediaType { get; set; }
}

namespace MoviePicker.Api.Domain.Entities;

public sealed record MovieList
{
    public const int MaxPerOwner = 50;

    public const int MaxItems = 500;

    public const int MaxNameLength = 60;

    public const int MaxDescriptionLength = 300;

    public const int SummaryPosterCount = 3;

    public const int MaxMembers = 20;

    public const int MemberPreviewCount = 3;

    public static readonly TimeSpan InviteLinkLifetime = TimeSpan.FromDays(7);

    public string Id { get; init; } = string.Empty;
    public string OwnerId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsPublic { get; init; }
    public IReadOnlyList<MovieListItem> Items { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public IReadOnlyList<MovieListMember> Members { get; init; } = [];
    public IReadOnlyList<MovieListInvitation> Invitations { get; init; } = [];
    public MovieListInviteLink? InviteLink { get; init; }

    public string NameKey => MovieListName.Key(Name);

    public int MemberCount => Members.Count + 1;

    public int SeatsTaken => MemberCount + Invitations.Count;

    public bool IsFull => SeatsTaken >= MaxMembers;

    public MovieListRole? RoleOf(string userId)
    {
        if (userId == OwnerId)
            return MovieListRole.Owner;
        return Members.Any(member => member.UserId == userId) ? MovieListRole.Member : null;
    }

    public bool IsInvited(string userId) => Invitations.Any(invitation => invitation.UserId == userId);

    public string AuthorOf(MovieListItem item) =>
        string.IsNullOrEmpty(item.AddedByUserId) ? OwnerId : item.AddedByUserId;

    public IReadOnlyList<string> PreviewMemberIds() =>
        [OwnerId, .. Members.Take(MemberPreviewCount - 1).Select(member => member.UserId)];

    public bool AcceptsInviteToken(string token, DateTimeOffset now) =>
        InviteLink is { } link && string.Equals(link.Token, token, StringComparison.Ordinal) && link.IsActive(now);

    public MovieListItem? Find(int tmdbId, MovieMediaType mediaType) =>
        Items.FirstOrDefault(item => item.TmdbId == tmdbId && item.MediaType == mediaType);

    public IReadOnlyList<string> RecentPosterPaths()
    {
        var posters = new List<string>(SummaryPosterCount);
        for (var index = Items.Count - 1; index >= 0 && posters.Count < SummaryPosterCount; index--)
        {
            if (!string.IsNullOrEmpty(Items[index].PosterPath))
                posters.Add(Items[index].PosterPath!);
        }

        return posters;
    }
}

namespace MoviePicker.Api.Application.DTOs;

public sealed record UserDataExportResponse
{
    public DateTimeOffset ExportedAt { get; init; }
    public ExportedProfile Profile { get; init; } = new();
    public IReadOnlyList<ExportedNotification> Notifications { get; init; } = Array.Empty<ExportedNotification>();
    public IReadOnlyList<ExportedConnection> Following { get; init; } = Array.Empty<ExportedConnection>();
    public IReadOnlyList<ExportedConnection> Followers { get; init; } = Array.Empty<ExportedConnection>();
    public IReadOnlyList<ExportedCreatedEvent> CreatedEvents { get; init; } = Array.Empty<ExportedCreatedEvent>();
    public IReadOnlyList<ExportedParticipation> Participations { get; init; } = Array.Empty<ExportedParticipation>();
    public IReadOnlyList<ExportedPushSubscription> PushSubscriptions { get; init; } = Array.Empty<ExportedPushSubscription>();
    public IReadOnlyList<ExportedWatchlistItem> Watchlist { get; init; } = Array.Empty<ExportedWatchlistItem>();
    public IReadOnlyList<ExportedMovieList> MovieLists { get; init; } = Array.Empty<ExportedMovieList>();
    public IReadOnlyList<ExportedJoinedMovieList> JoinedMovieLists { get; init; } = Array.Empty<ExportedJoinedMovieList>();
    public IReadOnlyList<ExportedListInvitation> PendingListInvitations { get; init; } = Array.Empty<ExportedListInvitation>();
    public IReadOnlyList<ExportedFriendGroup> FriendGroups { get; init; } = Array.Empty<ExportedFriendGroup>();
    public IReadOnlyList<ExportedJoinedFriendGroup> JoinedFriendGroups { get; init; } = Array.Empty<ExportedJoinedFriendGroup>();
    public IReadOnlyList<ExportedFriendGroupInvitation> PendingFriendGroupInvitations { get; init; } = Array.Empty<ExportedFriendGroupInvitation>();
    public IReadOnlyList<ExportedSavedList> SavedLists { get; init; } = Array.Empty<ExportedSavedList>();
    public IReadOnlyList<ExportedWatchedTitle> WatchedTitles { get; init; } = Array.Empty<ExportedWatchedTitle>();
    public IReadOnlyList<ExportedFavorite> Favorites { get; init; } = Array.Empty<ExportedFavorite>();
    public ExportedAvatarPhoto? AvatarPhoto { get; init; }
}

public sealed record ExportedAvatarPhoto
{
    public string ContentType { get; init; } = string.Empty;
    public string Base64Content { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed record ExportedProfile
{
    public string UserId { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public bool IsProfilePublic { get; init; }
    public bool IsWatchlistPublic { get; init; }
    public bool IsWatchedPublic { get; init; }
    public string UiTheme { get; init; } = string.Empty;
    public string AccentColor { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool HasPassword { get; init; }
    public IReadOnlyList<string> LinkedProviders { get; init; } = Array.Empty<string>();
    public IReadOnlyDictionary<string, bool> NotificationPreferences { get; init; } =
        new Dictionary<string, bool>();
    public DateTimeOffset? SupporterSince { get; init; }
    public string RatingScale { get; init; } = string.Empty;
    public bool DimWatched { get; init; }
    public string? LetterboxdUsername { get; init; }
    public bool LetterboxdSyncWatchlist { get; init; }
    public bool LetterboxdSyncWatched { get; init; }
    public IReadOnlyList<ExportedEventTemplate> EventTemplates { get; init; } = Array.Empty<ExportedEventTemplate>();
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed record ExportedEventTemplate
{
    public string Name { get; init; } = string.Empty;
    public string? Theme { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedNotification
{
    public string Type { get; init; } = string.Empty;
    public string? ActorHandle { get; init; }
    public string? ActorDisplayName { get; init; }
    public string? EventTitle { get; init; }
    public string? MovieTitle { get; init; }
    public string? ListName { get; init; }
    public string? GroupName { get; init; }
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedConnection
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
}

public sealed record ExportedCreatedEvent
{
    public string EventId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
}

public sealed record ExportedParticipation
{
    public string EventId { get; init; } = string.Empty;
    public string? EventTitle { get; init; }
    public string Pseudo { get; init; } = string.Empty;
    public DateTimeOffset JoinedAt { get; init; }
    public IReadOnlyList<ExportedVote> Votes { get; init; } = Array.Empty<ExportedVote>();
    public IReadOnlyList<ExportedSeenMark> SeenMarks { get; init; } = Array.Empty<ExportedSeenMark>();
    public IReadOnlyList<ExportedRating> Ratings { get; init; } = Array.Empty<ExportedRating>();
    public IReadOnlyList<ExportedProposedMovie> ProposedMovies { get; init; } = Array.Empty<ExportedProposedMovie>();
}

public sealed record ExportedProposedMovie
{
    public string MovieId { get; init; } = string.Empty;
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PitchNote { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedVote
{
    public string MovieId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedSeenMark
{
    public string MovieId { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedRating
{
    public string MovieId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed record ExportedPushSubscription
{
    public string Endpoint { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedFavorite
{
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
}

public sealed record ExportedWatchlistItem
{
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? LetterboxdSlug { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedMovieList
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsPublic { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public IReadOnlyList<ExportedMovieListItem> Items { get; init; } = Array.Empty<ExportedMovieListItem>();
}

public sealed record ExportedMovieListItem
{
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public DateTimeOffset AddedAt { get; init; }
}

public sealed record ExportedSavedList
{
    public string SourceType { get; init; } = string.Empty;
    public string SourceId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedWatchedTitle
{
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public DateTimeOffset WatchedAt { get; init; }
    public int? Rating { get; init; }
    public string? RatingOrigin { get; init; }
    public string Origin { get; init; } = string.Empty;
    public string? LetterboxdSlug { get; init; }
}

public sealed record ExportedJoinedMovieList
{
    public string ListId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public DateTimeOffset JoinedAt { get; init; }
}

public sealed record ExportedListInvitation
{
    public string ListId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public DateTimeOffset InvitedAt { get; init; }
}

public sealed record ExportedFriendGroup
{
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed record ExportedJoinedFriendGroup
{
    public string GroupId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public DateTimeOffset JoinedAt { get; init; }
}

public sealed record ExportedFriendGroupInvitation
{
    public string GroupId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public DateTimeOffset InvitedAt { get; init; }
}

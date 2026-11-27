using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class ExportUserDataHandler : IExportUserDataHandler
{
    private const int MaxItems = 10_000;

    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IFollowRepository _follows;
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IVoteRepository _votes;
    private readonly ISeenMarkRepository _seenMarks;
    private readonly IMovieRatingRepository _ratings;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IWatchlistRepository _watchlist;
    private readonly IMovieListRepository _movieLists;
    private readonly IFriendGroupRepository _groups;
    private readonly IWatchedTitleRepository _watchedTitles;
    private readonly ISavedListRepository _savedLists;
    private readonly IAvatarPhotoRepository _avatarPhotos;
    private readonly IBannerPhotoRepository _bannerPhotos;
    private readonly IMovieRepository _movies;
    private readonly TimeProvider _clock;

    public ExportUserDataHandler(
        IUserRepository users,
        IUserNotificationRepository notifications,
        IFollowRepository follows,
        IEventRepository events,
        IParticipantRepository participants,
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IMovieRatingRepository ratings,
        IPushSubscriptionRepository pushSubscriptions,
        IWatchlistRepository watchlist,
        IMovieListRepository movieLists,
        IFriendGroupRepository groups,
        IWatchedTitleRepository watchedTitles,
        ISavedListRepository savedLists,
        IAvatarPhotoRepository avatarPhotos,
        IBannerPhotoRepository bannerPhotos,
        IMovieRepository movies,
        TimeProvider clock)
    {
        _users = users;
        _notifications = notifications;
        _follows = follows;
        _events = events;
        _participants = participants;
        _votes = votes;
        _seenMarks = seenMarks;
        _ratings = ratings;
        _pushSubscriptions = pushSubscriptions;
        _watchlist = watchlist;
        _movieLists = movieLists;
        _groups = groups;
        _watchedTitles = watchedTitles;
        _savedLists = savedLists;
        _avatarPhotos = avatarPhotos;
        _bannerPhotos = bannerPhotos;
        _movies = movies;
        _clock = clock;
    }

    public async Task<UserDataExportResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();

        var notifications = await _notifications.ListByUserIdAsync(userId, MaxItems, offset: 0, ct);
        var followingIds = await _follows.GetFollowingIdsAsync(userId, MaxItems, ct);
        var followerIds = await _follows.GetFollowerIdsAsync(userId, MaxItems, ct);
        var createdEvents = await _events.ListByCreatorUserIdAsync(userId, MaxItems, ct);
        var participations = await _participants.ListByUserIdAsync(userId, MaxItems, ct);

        var followingUsers = await _users.ListByIdsAsync(followingIds, ct);
        var followerUsers = await _users.ListByIdsAsync(followerIds, ct);

        var participantIds = participations.Select(p => p.Id).ToList();
        var votes = await _votes.ListByParticipantIdsAsync(participantIds, ct);
        var seenMarks = await _seenMarks.ListByParticipantIdsAsync(participantIds, ct);
        var ratings = await _ratings.ListByParticipantIdsAsync(participantIds, ct);
        var proposedMovies = await _movies.ListByParticipantIdsAsync(participantIds, ct);
        var pushSubscriptions = await _pushSubscriptions.ListByUserIdAsync(userId, ct);

        var participationEventIds = participations.Select(p => p.EventId).Distinct().ToList();
        var participationEvents = await _events.ListByIdsAsync(participationEventIds, ct);
        var eventTitleById = participationEvents.ToDictionary(e => e.Id, e => e.Title);

        var watchlist = await _watchlist.ListByUserIdAsync(userId, MaxItems, ct);
        var movieLists = await _movieLists.ListByOwnerAsync(userId, ct);
        var joinedLists = await _movieLists.ListJoinedAsync(userId, ct);
        var invitingLists = await _movieLists.ListInvitingAsync(userId, ct);
        var contributedLists = await _movieLists.ListOthersWithItemsAddedByAsync(userId, ct);
        var listOwnerNames = await ListOwnerNamesAsync(joinedLists.Concat(invitingLists).Concat(contributedLists), ct);
        var ownedGroups = await _groups.ListByOwnerAsync(userId, ct);
        var joinedGroups = await _groups.ListJoinedAsync(userId, ct);
        var invitingGroups = await _groups.ListInvitingAsync(userId, ct);
        var groupOwnerNames = await DisplayNamesAsync(
            joinedGroups.Concat(invitingGroups).Select(group => group.OwnerId),
            ct);
        var watchedTitles = await _watchedTitles.ListByOwnerAsync(userId, ct);
        var savedLists = await _savedLists.ListByOwnerAsync(userId, ct);
        var avatarPhoto = await ExportAvatarPhotoAsync(user, ct);
        var bannerPhoto = await ExportBannerPhotoAsync(user, ct);

        var votesByParticipant = votes
            .GroupBy(v => v.ParticipantId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var seenByParticipant = seenMarks
            .GroupBy(s => s.ParticipantId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var ratingsByParticipant = ratings
            .GroupBy(r => r.ParticipantId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var proposedByParticipant = proposedMovies
            .GroupBy(m => m.ParticipantId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return new UserDataExportResponse
        {
            ExportedAt = _clock.GetUtcNow(),
            Profile = MapProfile(user),
            Notifications = notifications.Select(MapNotification).ToList(),
            Following = MapConnections(followingUsers),
            Followers = MapConnections(followerUsers),
            CreatedEvents = createdEvents.Select(MapCreatedEvent).ToList(),
            Participations = participations
                .Select(p => MapParticipation(
                    p,
                    eventTitleById,
                    votesByParticipant,
                    seenByParticipant,
                    ratingsByParticipant,
                    proposedByParticipant))
                .ToList(),
            PushSubscriptions = pushSubscriptions
                .Select(s => new ExportedPushSubscription { Endpoint = s.Endpoint, CreatedAt = s.CreatedAt })
                .ToList(),
            Watchlist = watchlist.Select(MapWatchlistItem).ToList(),
            MovieLists = movieLists.Select(MapMovieList).ToList(),
            JoinedMovieLists = joinedLists
                .Select(list => new ExportedJoinedMovieList
                {
                    ListId = list.Id,
                    Name = list.Name,
                    OwnerDisplayName = listOwnerNames.GetValueOrDefault(list.OwnerId, string.Empty),
                    JoinedAt = list.Members.First(member => member.UserId == userId).JoinedAt
                })
                .ToList(),
            TitlesAddedToOthersLists = contributedLists
                .Select(list => new ExportedListContribution
                {
                    ListId = list.Id,
                    Name = list.Name,
                    OwnerDisplayName = listOwnerNames.GetValueOrDefault(list.OwnerId, string.Empty),
                    Items = list.Items
                        .Where(item => item.AddedByUserId == userId)
                        .Select(MapMovieListItem)
                        .ToList()
                })
                .ToList(),
            PendingListInvitations = invitingLists
                .Select(list => new ExportedListInvitation
                {
                    ListId = list.Id,
                    Name = list.Name,
                    OwnerDisplayName = listOwnerNames.GetValueOrDefault(list.OwnerId, string.Empty),
                    InvitedAt = list.Invitations.First(invitation => invitation.UserId == userId).InvitedAt
                })
                .ToList(),
            FriendGroups = ownedGroups
                .Select(group => new ExportedFriendGroup { Name = group.Name, CreatedAt = group.CreatedAt, UpdatedAt = group.UpdatedAt })
                .ToList(),
            JoinedFriendGroups = joinedGroups
                .Select(group => new ExportedJoinedFriendGroup
                {
                    GroupId = group.Id,
                    Name = group.Name,
                    OwnerDisplayName = groupOwnerNames.GetValueOrDefault(group.OwnerId, string.Empty),
                    JoinedAt = group.Members.First(member => member.UserId == userId).JoinedAt
                })
                .ToList(),
            PendingFriendGroupInvitations = invitingGroups
                .Select(group => new ExportedFriendGroupInvitation
                {
                    GroupId = group.Id,
                    Name = group.Name,
                    OwnerDisplayName = groupOwnerNames.GetValueOrDefault(group.OwnerId, string.Empty),
                    InvitedAt = group.Invitations.First(invitation => invitation.UserId == userId).InvitedAt
                })
                .ToList(),
            SavedLists = savedLists.Select(MapSavedList).ToList(),
            WatchedTitles = watchedTitles.Select(MapWatchedTitle).ToList(),
            Favorites = user.Favorites.Select(MapFavorite).ToList(),
            AvatarPhoto = avatarPhoto,
            Banner = ExportedProfileBanner.From(user.Banner),
            BannerPhoto = bannerPhoto
        };
    }

    private Task<Dictionary<string, string>> ListOwnerNamesAsync(IEnumerable<MovieList> lists, CancellationToken ct) =>
        DisplayNamesAsync(lists.Select(list => list.OwnerId), ct);

    private async Task<Dictionary<string, string>> DisplayNamesAsync(IEnumerable<string> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0)
            return new Dictionary<string, string>(StringComparer.Ordinal);
        return (await _users.ListCardsByIdsAsync(ids, ct))
            .DistinctBy(card => card.Id, StringComparer.Ordinal)
            .ToDictionary(card => card.Id, card => card.DisplayName, StringComparer.Ordinal);
    }

    private static ExportedWatchlistItem MapWatchlistItem(WatchlistItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        LetterboxdSlug = item.LetterboxdSlug,
        CreatedAt = item.CreatedAt
    };

    private static ExportedMovieList MapMovieList(MovieList list) => new()
    {
        Name = list.Name,
        Description = list.Description,
        IsPublic = list.IsPublic,
        CreatedAt = list.CreatedAt,
        UpdatedAt = list.UpdatedAt,
        Items = list.Items.Select(MapMovieListItem).ToList()
    };

    private static ExportedMovieListItem MapMovieListItem(MovieListItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        AddedAt = item.AddedAt
    };

    private static ExportedSavedList MapSavedList(SavedList list) => new()
    {
        SourceType = list.SourceType,
        SourceId = list.SourceId,
        Name = list.Name,
        CreatedAt = list.CreatedAt
    };

    private static ExportedWatchedTitle MapWatchedTitle(WatchedTitle title) => new()
    {
        TmdbId = title.TmdbId,
        MediaType = title.MediaType,
        Title = title.Title,
        Year = title.Year,
        WatchedAt = title.WatchedAt,
        Rating = title.Rating,
        RatingOrigin = title.Rating is null ? null : title.RatingOrigin ?? WatchedOrigin.Manual,
        Origin = title.Origin,
        LetterboxdSlug = title.LetterboxdSlug
    };

    private static ExportedFavorite MapFavorite(FavoriteTitle favorite) => new()
    {
        TmdbId = favorite.TmdbId,
        MediaType = favorite.MediaType,
        Title = favorite.Title,
        Year = favorite.Year
    };

    private async Task<ExportedAvatarPhoto?> ExportAvatarPhotoAsync(User user, CancellationToken ct)
    {
        if (user.AvatarPhoto is not { } photo)
            return null;
        var stored = await _avatarPhotos.GetByKeyAsync(photo.Key, ct);
        return stored is null
            ? null
            : new ExportedAvatarPhoto
            {
                ContentType = stored.ContentType,
                Base64Content = Convert.ToBase64String(stored.Data),
                IsActive = photo.IsActive,
                UpdatedAt = photo.UpdatedAt
            };
    }

    private async Task<ExportedBannerPhoto?> ExportBannerPhotoAsync(User user, CancellationToken ct)
    {
        if (user.BannerPhoto is not { } photo)
            return null;
        var stored = await _bannerPhotos.GetByKeyAsync(photo.Key, ct);
        return stored is null
            ? null
            : new ExportedBannerPhoto
            {
                ContentType = stored.ContentType,
                Base64Content = Convert.ToBase64String(stored.Data),
                UpdatedAt = photo.UpdatedAt
            };
    }

    private static ExportedProfile MapProfile(User user) => new()
    {
        UserId = user.Id,
        Email = user.Email,
        EmailVerifiedAt = user.EmailVerifiedAt,
        DisplayName = user.DisplayName,
        Handle = user.Handle,
        Bio = user.Bio,
        IsProfilePublic = user.IsProfilePublic,
        IsWatchlistPublic = user.IsWatchlistPublic,
        IsWatchedPublic = user.IsWatchedPublic,
        UiTheme = user.UiTheme,
        AccentColor = user.AccentColor,
        AvatarId = user.AvatarId,
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        TwoFactorEnabledAt = user.TwoFactor?.EnabledAt,
        LinkedProviders = user.Identities.Select(i => i.Provider).ToList(),
        NotificationPreferences = user.NotificationPreferences
            .ToDictionary(kv => kv.Key.ToString().ToLowerInvariant(), kv => kv.Value),
        SupporterSince = user.SupporterSince,
        RatingScale = user.RatingScale,
        DimWatched = user.DimWatched,
        LetterboxdUsername = user.LetterboxdUsername,
        LetterboxdSyncWatchlist = user.LetterboxdSyncWatchlist,
        LetterboxdSyncWatched = user.LetterboxdSyncWatched,
        EventTemplates = user.EventTemplates
            .Select(t => new ExportedEventTemplate { Name = t.Name, Theme = t.Config.Theme, CreatedAt = t.CreatedAt })
            .ToList(),
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };

    private static ExportedNotification MapNotification(UserNotification n) => new()
    {
        Type = n.Type.ToString().ToLowerInvariant(),
        ActorHandle = n.ActorHandle,
        ActorDisplayName = n.ActorDisplayName,
        EventTitle = n.EventTitle,
        MovieTitle = n.MovieTitle,
        ListName = n.ListName,
        GroupName = n.GroupName,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt
    };

    private static List<ExportedConnection> MapConnections(IReadOnlyList<User> users) =>
        users
            .Select(u => new ExportedConnection { Handle = u.Handle, DisplayName = u.DisplayName })
            .ToList();

    private static ExportedCreatedEvent MapCreatedEvent(Event e) => new()
    {
        EventId = e.Id,
        Title = e.Title,
        Date = e.Date,
        Time = e.Time,
        Slug = e.Slug,
        CreatedAt = e.CreatedAt,
        ClosedAt = e.ClosedAt
    };

    private static ExportedParticipation MapParticipation(
        Participant p,
        Dictionary<string, string> eventTitleById,
        Dictionary<string, List<Vote>> votesByParticipant,
        Dictionary<string, List<SeenMark>> seenByParticipant,
        Dictionary<string, List<MovieRating>> ratingsByParticipant,
        Dictionary<string, List<Movie>> proposedByParticipant)
    {
        var votes = votesByParticipant.TryGetValue(p.Id, out var v) ? v : [];
        var seen = seenByParticipant.TryGetValue(p.Id, out var s) ? s : [];
        var ratings = ratingsByParticipant.TryGetValue(p.Id, out var r) ? r : [];
        var proposed = proposedByParticipant.TryGetValue(p.Id, out var m) ? m : [];
        return new ExportedParticipation
        {
            EventId = p.EventId,
            EventTitle = eventTitleById.TryGetValue(p.EventId, out var title) ? title : null,
            Pseudo = p.Pseudo,
            JoinedAt = p.CreatedAt,
            Votes = votes
                .Select(x => new ExportedVote { MovieId = x.MovieId, Value = x.Value, CreatedAt = x.CreatedAt })
                .ToList(),
            SeenMarks = seen
                .Select(x => new ExportedSeenMark { MovieId = x.MovieId, CreatedAt = x.CreatedAt })
                .ToList(),
            Ratings = ratings
                .Select(x => new ExportedRating { MovieId = x.MovieId, Value = x.Value, UpdatedAt = x.UpdatedAt })
                .ToList(),
            ProposedMovies = proposed
                .Select(x => new ExportedProposedMovie
                {
                    MovieId = x.Id,
                    TmdbId = x.TmdbId,
                    MediaType = x.MediaType,
                    Title = x.Title,
                    Year = x.Year,
                    PitchNote = x.PitchNote,
                    CreatedAt = x.CreatedAt
                })
                .ToList()

        };
    }
}

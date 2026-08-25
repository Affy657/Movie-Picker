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
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IWatchlistRepository _watchlist;
    private readonly TimeProvider _clock;

    public ExportUserDataHandler(
        IUserRepository users,
        IUserNotificationRepository notifications,
        IFollowRepository follows,
        IEventRepository events,
        IParticipantRepository participants,
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IPushSubscriptionRepository pushSubscriptions,
        IWatchlistRepository watchlist,
        TimeProvider clock)
    {
        _users = users;
        _notifications = notifications;
        _follows = follows;
        _events = events;
        _participants = participants;
        _votes = votes;
        _seenMarks = seenMarks;
        _pushSubscriptions = pushSubscriptions;
        _watchlist = watchlist;
        _clock = clock;
    }

    public async Task<UserDataExportResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");

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
        var pushSubscriptions = await _pushSubscriptions.ListByUserIdAsync(userId, ct);

        var participationEventIds = participations.Select(p => p.EventId).Distinct().ToList();
        var participationEvents = await _events.ListByIdsAsync(participationEventIds, ct);
        var eventTitleById = participationEvents.ToDictionary(e => e.Id, e => e.Title);

        var watchlist = await _watchlist.ListByUserIdAsync(userId, MaxItems, ct);

        var votesByParticipant = votes
            .GroupBy(v => v.ParticipantId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var seenByParticipant = seenMarks
            .GroupBy(s => s.ParticipantId)
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
                .Select(p => MapParticipation(p, eventTitleById, votesByParticipant, seenByParticipant))
                .ToList(),
            PushSubscriptions = pushSubscriptions
                .Select(s => new ExportedPushSubscription { Endpoint = s.Endpoint, CreatedAt = s.CreatedAt })
                .ToList(),
            Watchlist = watchlist.Select(MapWatchlistItem).ToList()
        };
    }

    private static ExportedWatchlistItem MapWatchlistItem(WatchlistItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType == MovieMediaType.Tv ? "tv" : "movie",
        Title = item.Title,
        Year = item.Year,
        CreatedAt = item.CreatedAt
    };

    private static ExportedProfile MapProfile(User user) => new()
    {
        UserId = user.Id,
        Email = user.Email,
        DisplayName = user.DisplayName,
        Handle = user.Handle,
        Bio = user.Bio,
        IsProfilePublic = user.IsProfilePublic,
        UiTheme = user.UiTheme.ToString(),
        AccentColor = user.AccentColor.ToString(),
        AvatarId = user.AvatarId,
        HasPassword = !string.IsNullOrEmpty(user.PasswordHash),
        LinkedProviders = user.Identities.Select(i => i.Provider).ToList(),
        NotificationPreferences = user.NotificationPreferences
            .ToDictionary(kv => kv.Key.ToString().ToLowerInvariant(), kv => kv.Value),
        SupporterSince = user.SupporterSince,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };

    private static ExportedNotification MapNotification(UserNotification n) => new()
    {
        Type = n.Type.ToString(),
        ActorHandle = n.ActorHandle,
        ActorDisplayName = n.ActorDisplayName,
        EventTitle = n.EventTitle,
        MovieTitle = n.MovieTitle,
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
        Dictionary<string, List<SeenMark>> seenByParticipant)
    {
        var votes = votesByParticipant.TryGetValue(p.Id, out var v) ? v : [];
        var seen = seenByParticipant.TryGetValue(p.Id, out var s) ? s : [];
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
                .ToList()
        };
    }
}

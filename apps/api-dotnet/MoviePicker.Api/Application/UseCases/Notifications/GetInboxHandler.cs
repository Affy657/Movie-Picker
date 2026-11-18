using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class GetInboxHandler : IGetInboxHandler
{
    private readonly IUserNotificationRepository _notifications;
    private readonly IUserRepository _users;
    private readonly IMovieListRepository _lists;
    private readonly TimeProvider _clock;

    public GetInboxHandler(
        IUserNotificationRepository notifications,
        IUserRepository users,
        IMovieListRepository lists,
        TimeProvider clock)
    {
        _notifications = notifications;
        _users = users;
        _lists = lists;
        _clock = clock;
    }

    private const int DefaultPageSize = 30;

    public async Task<NotificationInboxResponse> HandleAsync(
        string userId, int? limit, int? offset, CancellationToken ct = default)
    {
        var pageSize = limit is null ? DefaultPageSize : Math.Clamp(limit.Value, 1, 100);
        var skip = offset is null ? 0 : Math.Max(0, offset.Value);

        var page = await _notifications.ListByUserIdAsync(userId, limit: pageSize + 1, offset: skip, ct);
        var hasMore = page.Count > pageSize;
        var items = hasMore ? page.Take(pageSize).ToList() : page;

        var unreadCountTask = _notifications.GetUnreadCountAsync(userId, ct);
        var actorsTask = ResolveActorsAsync(items, ct);
        var pendingListsTask = PendingListInvitationsAsync(userId, items, ct);
        await Task.WhenAll(unreadCountTask, actorsTask, pendingListsTask);
        var unreadCount = await unreadCountTask;
        var actors = await actorsTask;
        var pendingLists = await pendingListsTask;

        return new NotificationInboxResponse
        {
            Items = items.Select(n => new UserNotificationItem
            {
                Id = n.Id,
                Type = n.Type.ToString().ToLowerInvariant(),
                ActorHandle = ActorOf(n, actors)?.PublicHandle,
                ActorDisplayName = n.ActorDisplayName,
                ActorAvatarId = ActorOf(n, actors)?.AvatarId ?? n.ActorAvatarId,
                EventSlug = n.EventSlug,
                EventTitle = n.EventTitle,
                MovieTitle = n.MovieTitle,
                ListId = n.ListId,
                ListName = n.ListName,
                ListInvitationPending = n.Type == UserNotificationType.ListInvitation
                    && n.ListId is { } listId
                    && pendingLists.Contains(listId),
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList(),
            UnreadCount = unreadCount,
            HasMore = hasMore
        };
    }

    private static DisplayedPerson? ActorOf(UserNotification notification, Dictionary<string, DisplayedPerson> actors) =>
        notification.ActorHandle is { } handle ? actors.GetValueOrDefault(HandlePolicy.Normalize(handle)) : null;

    private async Task<IReadOnlySet<string>> PendingListInvitationsAsync(
        string userId,
        IEnumerable<UserNotification> items,
        CancellationToken ct)
    {
        var listIds = items
            .Where(n => n.Type == UserNotificationType.ListInvitation)
            .Select(n => n.ListId)
            .OfType<string>()
            .Distinct(StringComparer.Ordinal)
            .ToList();
        return listIds.Count == 0
            ? new HashSet<string>(StringComparer.Ordinal)
            : await _lists.ListPendingInvitationIdsAsync(userId, listIds, _clock.GetUtcNow(), ct);
    }

    private async Task<Dictionary<string, DisplayedPerson>> ResolveActorsAsync(
        IEnumerable<UserNotification> items,
        CancellationToken ct)
    {
        var actorHandles = items.Select(n => n.ActorHandle).OfType<string>().Distinct(StringComparer.Ordinal).ToList();
        if (actorHandles.Count == 0)
            return new Dictionary<string, DisplayedPerson>(StringComparer.Ordinal);

        return (await _users.ListCardsByHandlesAsync(actorHandles, ct))
            .Where(card => !string.IsNullOrEmpty(card.Handle))
            .DistinctBy(card => card.Handle, StringComparer.Ordinal)
            .ToDictionary(card => card.Handle!, card => DisplayedPerson.From(card), StringComparer.Ordinal);
    }
}

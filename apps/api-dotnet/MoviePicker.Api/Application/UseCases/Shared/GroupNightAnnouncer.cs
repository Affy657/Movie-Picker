using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public interface IGroupNightAnnouncer
{
    Task AnnounceAsync(Event night, FriendGroup group, string hostUserId, CancellationToken ct = default);
}

public sealed class GroupNightAnnouncer : IGroupNightAnnouncer
{
    public const string HostQuotaScope = "group-night-announce";

    public const int MaxAnnouncementsPerHostPerGroupPerDay = 10;

    private static readonly TimeSpan HostQuotaWindow = TimeSpan.FromHours(24);

    private readonly EventAudienceNotifier _notifier;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly ISharedQuota _quota;
    private readonly ILogger<GroupNightAnnouncer> _logger;

    public GroupNightAnnouncer(
        EventAudienceNotifier notifier,
        IUserRepository users,
        IUserNotificationRepository notifications,
        ISharedQuota quota,
        ILogger<GroupNightAnnouncer> logger)
    {
        _notifier = notifier;
        _users = users;
        _notifications = notifications;
        _quota = quota;
        _logger = logger;
    }

    public async Task AnnounceAsync(Event night, FriendGroup group, string hostUserId, CancellationToken ct = default)
    {
        try
        {
            await AnnounceOnceAsync(night, group, hostUserId, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Group {GroupId} was not told about movie night {EventId}", group.Id, night.Id);
        }
    }

    private async Task AnnounceOnceAsync(Event night, FriendGroup group, string hostUserId, CancellationToken ct)
    {
        var told = await _notifications.ListUserIdsByTypeAndEventAsync(UserNotificationType.GroupNight, night.Id, ct);
        var recipients = Recipients(group, hostUserId).Where(userId => !told.Contains(userId)).ToList();
        if (recipients.Count == 0)
            return;
        if (!await _quota.TryConsumeAsync(
                HostQuotaScope, $"{hostUserId}|{group.Id}", MaxAnnouncementsPerHostPerGroupPerDay, HostQuotaWindow, ct))
        {
            _logger.LogInformation("Host {UserId} reached the daily announcements of group {GroupId}", hostUserId, group.Id);
            return;
        }

        var host = await _users.GetByIdAsync(hostUserId, ct);
        var inbox = new UserNotification
        {
            Type = UserNotificationType.GroupNight,
            EventId = night.Id,
            EventSlug = night.Slug,
            EventTitle = night.Title,
            GroupId = group.Id,
            GroupName = group.Name,
            IsRead = false
        }.WithActor(host);
        var push = ServerCopy.Push.GroupNight(host?.DisplayName, night.Title, group.Name)
            .ToMessage(tag: $"group-night-{night.Id}", url: FrontRoutes.EventDetail(night.Slug));

        await _notifier.NotifyUsersAsync(recipients, new EventAudienceMessage(night.Id, inbox, push), ct);
    }

    public static IReadOnlyList<string> Recipients(FriendGroup group, string hostUserId) =>
        group.Members
            .Select(member => member.UserId)
            .Prepend(group.OwnerId)
            .Where(userId => userId != hostUserId)
            .Distinct(StringComparer.Ordinal)
            .ToList();
}

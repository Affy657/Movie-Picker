using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class InviteToFriendGroupHandler : IInviteToFriendGroupHandler
{
    public const string PairQuotaScope = "group-invite-pair";
    public const int MaxInvitationsPerPairPerDay = 5;

    private static readonly TimeSpan PairQuotaWindow = TimeSpan.FromHours(24);

    private readonly IFriendGroupRepository _groups;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly ISharedQuota _quota;
    private readonly TimeProvider _clock;

    public InviteToFriendGroupHandler(
        IFriendGroupRepository groups,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        ISharedQuota quota,
        TimeProvider clock)
    {
        _groups = groups;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _quota = quota;
        _clock = clock;
    }

    public async Task<FriendGroupPendingInvitationResponse> HandleAsync(
        string userId,
        string groupId,
        InviteToFriendGroupRequest request,
        CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        var inviteeId = request.UserId.Trim();
        var now = _clock.StorageNow();
        if (group.RoleOf(inviteeId) is not null)
            throw Errors.FriendGroupAlreadyMember();
        if (group.IsInvited(inviteeId, now))
            throw Errors.FriendGroupInvitationAlreadySent();
        if (!await _follows.IsFollowingAsync(userId, inviteeId, ct))
            throw Errors.InviteOnlyFollowed();
        if (group.IsFull(now))
            throw Errors.FriendGroupMembersLimitReached(FriendGroup.MaxMembers);
        if (!await _quota.TryConsumeAsync(
                PairQuotaScope, $"{userId}|{inviteeId}", MaxInvitationsPerPairPerDay, PairQuotaWindow, ct))
            throw Errors.InvitationLimitReached();

        var invitee = await _users.GetByIdAsync(inviteeId, ct);
        var owner = await _users.GetByIdAsync(userId, ct);
        var invitation = new FriendGroupInvitation(inviteeId, now);
        if (!await _groups.AddInvitationAsync(group.Id, invitation, FriendGroup.MaxMembers, ct))
            throw await RefusalAsync(group.Id, inviteeId, now, ct);

        await NotifyAsync(group, owner, invitee, inviteeId, ct);

        return FriendGroupPendingInvitationResponse.From(
            invitee is null ? DisplayedPerson.Unknown(inviteeId) : DisplayedPerson.From(invitee),
            invitation.InvitedAt);
    }

    private async Task<Exception> RefusalAsync(string groupId, string inviteeId, DateTimeOffset now, CancellationToken ct)
    {
        var current = await _groups.FindAsync(groupId, ct);
        if (current is null)
            return Errors.FriendGroupNotFound();
        if (current.RoleOf(inviteeId) is not null)
            return Errors.FriendGroupAlreadyMember();
        if (current.IsInvited(inviteeId, now))
            return Errors.FriendGroupInvitationAlreadySent();
        return current.IsFull(now) ? Errors.FriendGroupMembersLimitReached(FriendGroup.MaxMembers) : Errors.ConcurrentUpdate();
    }

    private async Task NotifyAsync(FriendGroup group, User? owner, User? invitee, string inviteeId, CancellationToken ct)
    {
        var withheld = invitee is not null && !invitee.NotifiesOn(UserNotificationType.GroupInvitation);
        try
        {
            await _notifications.DeleteGroupInvitationAsync(group.Id, inviteeId, ct);
            await _notifications.AddAsync(new UserNotification
            {
                UserId = inviteeId,
                Type = UserNotificationType.GroupInvitation,
                GroupId = group.Id,
                GroupName = group.Name,
                IsRead = false,
                IsWithheld = withheld,
                CreatedAt = _clock.GetUtcNow()
            }.WithActor(owner), ct);
        }
        catch (Exception)
        {
            await _groups.RemoveInvitationAsync(group.Id, inviteeId, CancellationToken.None);
            throw;
        }

        if (invitee is null || withheld)
            return;

        var subscriptions = await _pushSubscriptions.ListByUserIdAsync(inviteeId, ct);
        var message = ServerCopy.Push.GroupInvitation(owner?.DisplayName, group.Name).ToMessage(
            tag: $"group-invite-{group.Id}",
            url: FrontRoutes.Groups);
        await PushFanOut.SendToAllAsync(_pushSender, subscriptions, message, ct);
    }
}

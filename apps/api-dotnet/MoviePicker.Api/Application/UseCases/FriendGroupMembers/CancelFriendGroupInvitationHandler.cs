using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class CancelFriendGroupInvitationHandler : ICancelFriendGroupInvitationHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserNotificationRepository _notifications;

    public CancelFriendGroupInvitationHandler(IFriendGroupRepository groups, IUserNotificationRepository notifications)
    {
        _groups = groups;
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, string groupId, string inviteeId, CancellationToken ct = default)
    {
        await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        if (await _groups.RemoveInvitationAsync(groupId, inviteeId, ct))
            await _notifications.DeleteGroupInvitationAsync(groupId, inviteeId, ct);
    }
}

using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class DeleteFriendGroupHandler : IDeleteFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IEventRepository _events;
    private readonly IUserNotificationRepository _notifications;

    public DeleteFriendGroupHandler(
        IFriendGroupRepository groups,
        IEventRepository events,
        IUserNotificationRepository notifications)
    {
        _groups = groups;
        _events = events;
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        if (!await _groups.DeleteAsync(userId, groupId, ct))
            throw Errors.FriendGroupNotFound();
        await _events.DetachGroupsAsync([groupId], ct);
        await _notifications.DeleteByGroupAsync(groupId, ct);
    }
}

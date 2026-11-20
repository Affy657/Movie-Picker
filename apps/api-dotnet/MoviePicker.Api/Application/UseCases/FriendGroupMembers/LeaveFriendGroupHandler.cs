using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class LeaveFriendGroupHandler : ILeaveFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;

    public LeaveFriendGroupHandler(IFriendGroupRepository groups)
    {
        _groups = groups;
    }

    public async Task HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireAsync(_groups, userId, groupId, ct);
        if (group.OwnerId == userId)
            throw Errors.FriendGroupOwnerCannotLeave();
        await _groups.RemoveMemberAsync(groupId, userId, disableInviteLink: false, ct);
    }
}

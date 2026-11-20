using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class RemoveFriendGroupMemberHandler : IRemoveFriendGroupMemberHandler
{
    private readonly IFriendGroupRepository _groups;

    public RemoveFriendGroupMemberHandler(IFriendGroupRepository groups)
    {
        _groups = groups;
    }

    public async Task HandleAsync(string userId, string groupId, string memberId, CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        if (memberId == group.OwnerId)
            throw Errors.FriendGroupOwnerCannotLeave();
        await _groups.RemoveMemberAsync(groupId, memberId, disableInviteLink: true, ct);
    }
}

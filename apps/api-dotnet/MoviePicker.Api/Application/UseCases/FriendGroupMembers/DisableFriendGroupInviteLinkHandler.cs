using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class DisableFriendGroupInviteLinkHandler : IDisableFriendGroupInviteLinkHandler
{
    private readonly IFriendGroupRepository _groups;

    public DisableFriendGroupInviteLinkHandler(IFriendGroupRepository groups)
    {
        _groups = groups;
    }

    public async Task HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        await _groups.DisableInviteLinkAsync(userId, groupId, ct);
    }
}

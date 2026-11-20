using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class DeclineFriendGroupInvitationHandler : IDeclineFriendGroupInvitationHandler
{
    private readonly IFriendGroupRepository _groups;

    public DeclineFriendGroupInvitationHandler(IFriendGroupRepository groups)
    {
        _groups = groups;
    }

    public Task HandleAsync(string userId, string groupId, CancellationToken ct = default) =>
        _groups.RemoveInvitationAsync(groupId, userId, ct);
}

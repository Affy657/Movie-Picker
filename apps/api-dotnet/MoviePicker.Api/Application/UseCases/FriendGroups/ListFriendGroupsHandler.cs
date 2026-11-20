using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class ListFriendGroupsHandler : IListFriendGroupsHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly FriendGroupNightsReader _nights;
    private readonly TimeProvider _clock;

    public ListFriendGroupsHandler(
        IFriendGroupRepository groups,
        IUserRepository users,
        FriendGroupNightsReader nights,
        TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _nights = nights;
        _clock = clock;
    }

    public async Task<MyGroupsResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var admitted = await _groups.ListAdmittingAsync(userId, ct);
        var now = _clock.GetUtcNow();
        var invitations = (await _groups.ListInvitingAsync(userId, ct))
            .SelectMany(group => group.PendingInvitations(now)
                .Where(invitation => invitation.UserId == userId)
                .Select(invitation => (Group: group, Invitation: invitation)))
            .OrderByDescending(pending => pending.Invitation.InvitedAt)
            .ToList();
        if (admitted.Count == 0 && invitations.Count == 0)
            return new MyGroupsResponse();

        var people = await FriendGroupPeople.LoadPreviewsAsync(
            _users,
            [.. admitted, .. invitations.Select(pending => pending.Group)],
            ct);
        return new MyGroupsResponse
        {
            Groups = [.. admitted.Select(group => people.SummaryOf(userId, group))],
            Invitations = [.. invitations.Select(pending => people.InvitationOf(pending.Group, pending.Invitation))],
            NextNights = await _nights.NextNightsAsync(userId, admitted, ct)
        };
    }
}

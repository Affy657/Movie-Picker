using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class GetFriendGroupMembersHandler : IGetFriendGroupMembersHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public GetFriendGroupMembersHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupMembersResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireAsync(_groups, userId, groupId, ct);
        var ownerView = group.OwnerId == userId;
        var now = _clock.GetUtcNow();
        List<FriendGroupInvitation> pending = ownerView ? [.. group.PendingInvitations(now)] : [];
        var people = await FriendGroupPeople.LoadAsync(
            _users,
            [
                group.OwnerId,
                .. group.Members.Select(member => member.UserId),
                .. pending.Select(invitation => invitation.UserId)
            ],
            ct);

        return new FriendGroupMembersResponse
        {
            Members = people.MembersOf(group),
            Invitations = ownerView
                ? [.. pending.Select(invitation => FriendGroupPendingInvitationResponse.From(people.PersonOf(invitation.UserId), invitation.InvitedAt))]
                : null,
            InviteLink = ownerView && group.InviteLink is { } link ? FriendGroupInviteLinkResponse.From(link, now) : null
        };
    }
}

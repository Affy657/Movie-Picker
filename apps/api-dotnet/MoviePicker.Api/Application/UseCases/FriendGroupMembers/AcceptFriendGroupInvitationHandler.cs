using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class AcceptFriendGroupInvitationHandler : IAcceptFriendGroupInvitationHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public AcceptFriendGroupInvitationHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupSummaryResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        var group = await _groups.FindAsync(groupId, ct) ?? throw Errors.FriendGroupInvitationNotFound();
        if (group.RoleOf(userId) is null)
            group = await AcceptAsync(group, userId, ct);

        return await FriendGroupPeople.DescribeAsync(_users, group, userId, ct);
    }

    private async Task<FriendGroup> AcceptAsync(FriendGroup group, string userId, CancellationToken ct)
    {
        var now = _clock.StorageNow();
        if (!group.IsInvited(userId, now))
            throw Errors.FriendGroupInvitationNotFound();
        await _groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(userId, now), ct);
        return await _groups.GetAsync(userId, group.Id, ct) ?? throw Errors.FriendGroupInvitationNotFound();
    }
}

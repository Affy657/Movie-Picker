using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class JoinFriendGroupHandler : IJoinFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public JoinFriendGroupHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupJoinResponse> HandleAsync(string userId, string token, CancellationToken ct = default)
    {
        var group = await FriendGroupInviteLinks.FindAsync(_groups, token, ct) ?? throw Errors.FriendGroupInviteLinkInvalid();
        if (group.RoleOf(userId) is not null)
            return await AnswerAsync(group, userId, joined: false, ct);

        var now = _clock.StorageNow();
        if (!group.AcceptsInviteToken(token, now))
            throw Errors.FriendGroupInviteLinkInvalid();
        if (await _groups.JoinByInviteTokenAsync(token, new FriendGroupMember(userId, now), now, FriendGroup.MaxMembers, ct))
            return await AnswerAsync(await _groups.GetAsync(userId, group.Id, ct) ?? group, userId, joined: true, ct);

        var current = await FriendGroupInviteLinks.FindAsync(_groups, token, ct);
        if (current?.RoleOf(userId) is not null)
            return await AnswerAsync(current, userId, joined: false, ct);
        if (current is null || !current.AcceptsInviteToken(token, now))
            throw Errors.FriendGroupInviteLinkInvalid();
        throw current.IsFull(now) && !current.IsInvited(userId, now)
            ? Errors.FriendGroupMembersLimitReached(FriendGroup.MaxMembers)
            : Errors.ConcurrentUpdate();
    }

    private async Task<FriendGroupJoinResponse> AnswerAsync(FriendGroup group, string userId, bool joined, CancellationToken ct) =>
        new() { Group = await FriendGroupPeople.DescribeAsync(_users, group, userId, ct), Joined = joined };
}

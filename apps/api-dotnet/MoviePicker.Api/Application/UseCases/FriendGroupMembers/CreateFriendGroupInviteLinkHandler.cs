using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class CreateFriendGroupInviteLinkHandler : ICreateFriendGroupInviteLinkHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly TimeProvider _clock;

    public CreateFriendGroupInviteLinkHandler(IFriendGroupRepository groups, TimeProvider clock)
    {
        _groups = groups;
        _clock = clock;
    }

    public async Task<FriendGroupInviteLinkResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        var now = _clock.StorageNow();
        var link = new FriendGroupInviteLink(FriendGroupInviteToken.New(), now + FriendGroup.InviteLinkLifetime, Disabled: false);
        if (!await _groups.SetInviteLinkAsync(userId, groupId, link, ct))
            throw Errors.FriendGroupNotFound();
        return FriendGroupInviteLinkResponse.From(link, now);
    }
}

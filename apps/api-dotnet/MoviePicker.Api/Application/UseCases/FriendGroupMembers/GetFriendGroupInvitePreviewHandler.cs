using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class GetFriendGroupInvitePreviewHandler : IGetFriendGroupInvitePreviewHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public GetFriendGroupInvitePreviewHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupInvitePreviewResponse> HandleAsync(string? viewerId, string token, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        var group = await FriendGroupInviteLinks.FindActiveAsync(_groups, token, now, ct)
            ?? throw Errors.FriendGroupInviteLinkInvalid();
        var role = viewerId is null ? null : group.RoleOf(viewerId);
        var keptSeat = viewerId is not null && group.IsInvited(viewerId, now);
        var people = await FriendGroupPeople.LoadPreviewsAsync(_users, [group], ct);

        return new FriendGroupInvitePreviewResponse
        {
            Name = group.Name,
            OwnerDisplayName = people.PersonOf(group.OwnerId).DisplayName,
            MemberCount = group.MemberCount,
            MemberPreview = [.. people.PreviewOf(group).Select(FriendGroupPreviewPersonResponse.From)],
            IsFull = role is null && !keptSeat && group.IsFull(now),
            Role = role,
            GroupId = role is null ? null : group.Id
        };
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class UpdateFriendGroupHandler : IUpdateFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public UpdateFriendGroupHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupSummaryResponse> HandleAsync(
        string userId,
        string groupId,
        UpdateFriendGroupRequest request,
        CancellationToken ct = default)
    {
        var name = FriendGroupPolicy.NormalizeName(request.Name);
        await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);

        var renamed = await _groups.RenameAsync(userId, groupId, name, _clock.StorageNow(), ct)
            ?? throw Errors.FriendGroupNotFound();
        return await FriendGroupPeople.DescribeAsync(_users, renamed, userId, ct);
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class CreateFriendGroupHandler : ICreateFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public CreateFriendGroupHandler(IFriendGroupRepository groups, IUserRepository users, TimeProvider clock)
    {
        _groups = groups;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupSummaryResponse> HandleAsync(
        string userId,
        CreateFriendGroupRequest request,
        CancellationToken ct = default)
    {
        var name = FriendGroupPolicy.NormalizeName(request.Name);
        await FriendGroupPolicy.EnsureRoomForNewGroupAsync(_groups, userId, ct);

        var now = _clock.StorageNow();
        await _users.RequireAccountAsync(userId, ct);
        var created = await _groups.AddAsync(
            new FriendGroup { OwnerId = userId, Name = name, CreatedAt = now, UpdatedAt = now },
            ct);
        return await FriendGroupPeople.DescribeAsync(_users, created, userId, ct);
    }
}

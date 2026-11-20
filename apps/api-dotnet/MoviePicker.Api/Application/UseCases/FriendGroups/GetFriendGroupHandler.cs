using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class GetFriendGroupHandler : IGetFriendGroupHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IUserRepository _users;
    private readonly FriendGroupNightsReader _nights;

    public GetFriendGroupHandler(IFriendGroupRepository groups, IUserRepository users, FriendGroupNightsReader nights)
    {
        _groups = groups;
        _users = users;
        _nights = nights;
    }

    public async Task<FriendGroupDetailResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireAsync(_groups, userId, groupId, ct);
        var people = await FriendGroupPeople.LoadAsync(
            _users,
            [group.OwnerId, .. group.Members.Select(member => member.UserId)],
            ct);
        var nights = await _nights.ReadAsync(userId, group, ct);
        return FriendGroupDetailResponse.From(group, people.AudienceOf(userId, group), people.MembersOf(group), nights);
    }
}

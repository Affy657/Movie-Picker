using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public interface IListFriendGroupsHandler
{
    Task<MyGroupsResponse> HandleAsync(string userId, CancellationToken ct = default);
}

public interface ICreateFriendGroupHandler
{
    Task<FriendGroupSummaryResponse> HandleAsync(string userId, CreateFriendGroupRequest request, CancellationToken ct = default);
}

public interface IGetFriendGroupHandler
{
    Task<FriendGroupDetailResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IUpdateFriendGroupHandler
{
    Task<FriendGroupSummaryResponse> HandleAsync(
        string userId,
        string groupId,
        UpdateFriendGroupRequest request,
        CancellationToken ct = default);
}

public interface IDeleteFriendGroupHandler
{
    Task HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IGetFriendGroupRankingHandler
{
    Task<FriendGroupRankingResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

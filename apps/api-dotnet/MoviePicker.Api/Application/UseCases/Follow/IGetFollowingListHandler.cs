using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Follow;

public interface IGetFollowingListHandler
{
    Task<FollowListResponse> HandleAsync(string handle, string? currentUserId, CancellationToken ct = default);
}

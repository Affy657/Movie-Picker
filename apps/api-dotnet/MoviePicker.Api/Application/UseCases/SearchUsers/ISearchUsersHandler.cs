using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SearchUsers;

public interface ISearchUsersHandler
{
    Task<FollowListResponse> HandleAsync(string? query, string? currentUserId, CancellationToken ct = default);
}

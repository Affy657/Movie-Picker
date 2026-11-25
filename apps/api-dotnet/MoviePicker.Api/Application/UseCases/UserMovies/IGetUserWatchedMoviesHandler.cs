using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetUserWatchedMoviesHandler
{
    Task<UserWatchedMoviesResponse> HandleAsync(
        string handle,
        string? currentUserId,
        int skip,
        int take,
        CancellationToken ct = default);

    Task<UserWatchedMoviesResponse> HandleForUserAsync(string userId, int skip, int take, CancellationToken ct = default);

    Task<UserWatchedMoviesResponse> HandleNightsForUserAsync(string userId, int take, CancellationToken ct = default);
}

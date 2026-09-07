using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetFollowedWatchedMoviesHandler
{
    Task<UserWatchedMoviesResponse> HandleAsync(string userId, int take, CancellationToken ct = default);
}

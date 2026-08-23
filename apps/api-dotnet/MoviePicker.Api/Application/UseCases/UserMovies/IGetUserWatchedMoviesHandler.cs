using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetUserWatchedMoviesHandler
{
    Task<UserWatchedMoviesResponse> HandleAsync(string handle, int take, CancellationToken ct = default);
}

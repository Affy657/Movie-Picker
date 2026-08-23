using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetUserMoviesHandler
{
    Task<UserMoviesResponse> HandleAsync(string handle, int skip, int take, CancellationToken ct = default);
}

using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetMyNightMoviesHandler
{
    Task<MyNightMoviesResponse> HandleAsync(string userId, CancellationToken ct = default);
}

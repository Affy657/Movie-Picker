using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetUserProposedMoviesHandler
{
    Task<UserProposedMoviesResponse> HandleAsync(
        string handle,
        string? currentUserId,
        bool winningOnly,
        CancellationToken ct = default);
}

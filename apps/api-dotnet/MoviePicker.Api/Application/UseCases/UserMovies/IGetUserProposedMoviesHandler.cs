using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public interface IGetUserProposedMoviesHandler
{
    Task<UserProposedMoviesResponse> HandleAsync(
        string handle,
        string? currentUserId,
        bool winningOnly,
        CancellationToken ct = default);

    Task<UserProposedMoviesResponse> HandleForUserAsync(
        string userId,
        bool winningOnly,
        CancellationToken ct = default);

    Task<UserProposedMoviesResponse> HandleForOwnerAsync(
        string userId,
        bool winningOnly,
        CancellationToken ct = default);
}

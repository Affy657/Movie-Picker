using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public interface IListMoviesForEventHandler
{
    Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string slug,
        string? participantId = null,
        CancellationToken ct = default);

    Task<IReadOnlyList<MovieWithScoreResponse>> HandleSelectionAsync(
        string slug,
        IReadOnlyCollection<string> movieIds,
        string? participantId = null,
        CancellationToken ct = default);
}

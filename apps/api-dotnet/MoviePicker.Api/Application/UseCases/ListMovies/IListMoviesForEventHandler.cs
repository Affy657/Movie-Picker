using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public interface IListMoviesForEventHandler
{
    Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string idOrSlug,
        string? participantId = null,
        CancellationToken ct = default);

    Task<IReadOnlyList<MovieWithScoreResponse>> HandleSelectionAsync(
        string idOrSlug,
        IReadOnlyCollection<string> movieIds,
        string? participantId = null,
        CancellationToken ct = default);
}

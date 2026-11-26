using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public interface IListMoviesForEventHandler
{
    Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(
        string slug,
        CatalogLanguage language,
        string? participantId = null,
        CancellationToken ct = default);

    Task<IReadOnlyList<MovieWithScoreResponse>> HandleSelectionAsync(
        string slug,
        IReadOnlyCollection<string> movieIds,
        CatalogLanguage language,
        string? participantId = null,
        CancellationToken ct = default);
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public sealed record MovieSearchFilters(
    IReadOnlyList<int> GenreIds,
    int? YearFrom,
    int? YearTo,
    double? VoteMin = null,
    string? OriginalLanguage = null,
    int? RuntimeMin = null,
    int? RuntimeMax = null);

public interface ISearchMoviesHandler
{
    Task<MovieSearchListResponse> HandleAsync(
        string query,
        string? eventSlug,
        CatalogLanguage language,
        MovieSearchFilters? filters = null,
        bool includeSeries = false,
        CancellationToken ct = default);
}

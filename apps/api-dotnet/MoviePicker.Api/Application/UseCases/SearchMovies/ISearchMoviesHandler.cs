using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public sealed record MovieSearchFilters(
    IReadOnlyList<int> GenreIds,
    int? YearFrom,
    int? YearTo,
    double? VoteMin = null,
    string? OriginalLanguage = null);

public interface ISearchMoviesHandler
{
    Task<MovieSearchListResponse> HandleAsync(
        string query,
        bool allowSeries,
        MovieSearchFilters? filters = null,
        CancellationToken ct = default);
}

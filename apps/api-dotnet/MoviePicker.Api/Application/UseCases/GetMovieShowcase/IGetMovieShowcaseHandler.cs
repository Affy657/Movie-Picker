using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed record MovieShowcaseQuery(
    string Section,
    string? Theme = null,
    IReadOnlyList<int>? GenreIds = null,
    int? CollectionId = null,
    string? Provider = null,
    int? SeedTmdbId = null);

public interface IGetMovieShowcaseHandler
{
    Task<MovieShowcaseListResponse> HandleAsync(MovieShowcaseQuery query, CancellationToken ct = default);
}

public interface IGetMovieCollectionsHandler
{
    Task<MovieCollectionListResponse> HandleAsync(CancellationToken ct = default);
}

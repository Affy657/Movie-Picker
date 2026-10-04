using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed record MovieShowcaseQuery(
    string Section,
    string? Theme = null,
    IReadOnlyList<int>? GenreIds = null,
    int? CollectionId = null,
    string? Provider = null,
    int? SeedTmdbId = null,
    MovieMediaType SeedMediaType = MovieMediaType.Movie);

public interface IGetMovieShowcaseHandler
{
    Task<MovieShowcaseListResponse> HandleAsync(MovieShowcaseQuery query, CancellationToken ct = default);

    Task<bool> RefreshAsync(MovieShowcaseQuery query, CancellationToken ct = default);
}

public interface IGetMovieCollectionsHandler
{
    Task<MovieCollectionListResponse> HandleAsync(CancellationToken ct = default);

    Task<bool> RefreshAsync(CancellationToken ct = default);
}

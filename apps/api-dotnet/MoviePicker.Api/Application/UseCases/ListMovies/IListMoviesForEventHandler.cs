using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public interface IListMoviesForEventHandler
{
    Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(string idOrSlug, CancellationToken ct = default);
}

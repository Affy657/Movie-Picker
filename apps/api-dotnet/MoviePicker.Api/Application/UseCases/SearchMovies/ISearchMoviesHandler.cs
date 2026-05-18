using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public interface ISearchMoviesHandler
{
    Task<MovieSearchListResponse> HandleAsync(string query, bool allowSeries, CancellationToken ct = default);
}

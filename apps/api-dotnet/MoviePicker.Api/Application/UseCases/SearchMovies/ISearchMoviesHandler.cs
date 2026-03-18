using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public interface ISearchMoviesHandler
{
    Task<IReadOnlyList<TmdbSearchItem>> HandleAsync(string query, CancellationToken ct = default);
}

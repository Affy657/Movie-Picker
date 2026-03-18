using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public sealed class SearchMoviesHandler : ISearchMoviesHandler
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public SearchMoviesHandler(ITmdbMovieSearch tmdb, IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> HandleAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new ServiceUnavailableException("Recherche films temporairement indisponible");

        try
        {
            return await _tmdb.SearchAsync(query, ct);
        }
        catch (HttpRequestException ex)
        {
            throw new BadRequestException($"TMDB indisponible: {ex.Message}");
        }
    }
}

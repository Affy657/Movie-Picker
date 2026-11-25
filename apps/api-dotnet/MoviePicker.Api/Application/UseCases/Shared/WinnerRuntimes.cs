using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public interface IWinnerRuntimes
{
    Task<int?> LookUpAsync(Movie winner, CancellationToken ct);
}

public sealed class TmdbWinnerRuntimes : IWinnerRuntimes
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<TmdbWinnerRuntimes> _logger;

    public TmdbWinnerRuntimes(ITmdbMovieSearch tmdb, IOptions<MoviePickerOptions> options, ILogger<TmdbWinnerRuntimes> logger)
    {
        _tmdb = tmdb;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int?> LookUpAsync(Movie winner, CancellationToken ct)
    {
        var key = (winner.TmdbId, winner.MediaType);
        try
        {
            var enrichments = await TmdbEnrichments.LoadAsync([key], _tmdb, _options, CatalogLanguage.French, ct);
            var runtime = enrichments.GetValueOrDefault(key)?.RuntimeMinutes;
            return runtime > 0 ? runtime : null;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "TMDB runtime lookup failed for {TmdbId}, the night keeps its default length", winner.TmdbId);
            return null;
        }
    }
}

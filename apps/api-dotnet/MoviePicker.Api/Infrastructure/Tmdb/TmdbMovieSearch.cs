using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch : ITmdbMovieSearch
{
    private const string PosterBase = "https://image.tmdb.org/t/p/w154";
    private const string LogoBase = "https://image.tmdb.org/t/p/w45";
    private const string YoutubeWatchBase = "https://www.youtube.com/watch?v=";
    private const string ResultsProperty = "results";
    private const int MaxResults = 20;
    private const int MinPersonQueryLength = 3;
    private const double MinPersonPopularity = 1d;

    private sealed class TmdbUnavailableMarker
    {
        public static readonly TmdbUnavailableMarker Instance = new();
    }

    private sealed record PersonMatch(int Id, bool LeadsResults);

    private sealed record PersonCreditMatches(IReadOnlyList<TmdbSearchItem> Items, bool LeadsResults)
    {
        public static readonly PersonCreditMatches None = new(Array.Empty<TmdbSearchItem>(), false);
    }

    private static readonly (string Property, Func<JsonElement, bool> KeepCredit)[] PersonCreditSources =
    [
        ("cast", static _ => true),
        ("crew", IsDirectingCredit)
    ];

    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ISharedCache _sharedCache;
    private readonly ILogger<TmdbMovieSearch> _logger;

    private TimeSpan FailureCacheTtl() =>
        TimeSpan.FromMinutes(Math.Clamp(_options.TmdbFailureCacheMinutes, 1, 60));

    public TmdbMovieSearch(
        HttpClient http,
        IOptions<MoviePickerOptions> options,
        IMemoryCache cache,
        ISharedCache sharedCache,
        ILogger<TmdbMovieSearch> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _sharedCache = sharedCache;
        _logger = logger;
    }

    private void RequireCredentials()
    {
        if (!_options.HasTmdbCredentials)
            throw new InvalidOperationException("TMDB credentials are missing: set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY");
    }
}

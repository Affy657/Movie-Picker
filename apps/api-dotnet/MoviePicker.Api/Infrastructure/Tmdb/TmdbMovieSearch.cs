using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbMovieSearch : ITmdbMovieSearch
{
    private const string PosterBase = "https://image.tmdb.org/t/p/w154";
    private const string LogoBase = "https://image.tmdb.org/t/p/w45";

    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TmdbMovieSearch> _logger;

    public TmdbMovieSearch(
        HttpClient http,
        IOptions<MoviePickerOptions> options,
        IMemoryCache cache,
        ILogger<TmdbMovieSearch> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new InvalidOperationException("TMDB_API_KEY manquante");

        var q = Uri.EscapeDataString(query.Trim());
        if (q.Length == 0)
            return Array.Empty<TmdbSearchItem>();

        var url =
            $"https://api.themoviedb.org/3/search/movie?api_key={Uri.EscapeDataString(_options.TmdbApiKey)}&query={q}&language=fr-FR";
        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("results", out var results))
            return Array.Empty<TmdbSearchItem>();

        var list = new List<TmdbSearchItem>();
        var n = 0;
        foreach (var item in results.EnumerateArray())
        {
            if (n++ >= 20)
                break;
            var id = item.GetProperty("id").GetInt32();
            var title = item.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
            if (string.IsNullOrEmpty(title) && item.TryGetProperty("name", out var name))
                title = name.GetString() ?? string.Empty;
            var date = item.TryGetProperty("release_date", out var rd)
                ? rd.GetString()
                : item.TryGetProperty("first_air_date", out var fad) ? fad.GetString() : null;
            var year = date is { Length: >= 4 } ? date[..4] : string.Empty;
            string? posterPath = null;
            if (item.TryGetProperty("poster_path", out var pp) && pp.ValueKind == JsonValueKind.String)
            {
                var p = pp.GetString();
                if (!string.IsNullOrEmpty(p))
                    posterPath = PosterBase + p;
            }

            double? voteAverage = null;
            if (item.TryGetProperty("vote_average", out var va) && va.ValueKind == JsonValueKind.Number)
                voteAverage = va.GetDouble();

            list.Add(new TmdbSearchItem(id, title, year, posterPath, voteAverage));
        }

        return list;
    }

    public async Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, string region, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            return null;

        var r = string.IsNullOrWhiteSpace(region) ? "FR" : region.Trim().ToUpperInvariant();
        var cacheKey = $"tmdb-enrich:{r}:{tmdbId}";
        var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));

        if (_cache.TryGetValue(cacheKey, out object? boxed) && boxed is TmdbMovieEnrichment cached)
            return cached;

        try
        {
            var fresh = await FetchEnrichmentUncachedAsync(tmdbId, r, ct).ConfigureAwait(false);
            _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            return fresh;
        }
        catch (Exception ex) when (
            ex is HttpRequestException
                or TaskCanceledException
                or JsonException
                or InvalidOperationException
                or FormatException)
        {
            // InvalidOperationException / FormatException : parsing TMDB inattendu
            // (ex. champ numérique hors plage int, type JSON incohérent) — on dégrade sans casser la liste.
            _logger.LogWarning(ex, "TMDB enrichissement échoué pour movie {TmdbId} région {Region}", tmdbId, r);
            return null;
        }
    }

    private async Task<TmdbMovieEnrichment> FetchEnrichmentUncachedAsync(int tmdbId, string region, CancellationToken ct)
    {
        var key = Uri.EscapeDataString(_options.TmdbApiKey!);
        var movieUrl = $"https://api.themoviedb.org/3/movie/{tmdbId}?api_key={key}&language=fr-FR";
        var watchUrl = $"https://api.themoviedb.org/3/movie/{tmdbId}/watch/providers?api_key={key}";

        var movieTask = _http.GetAsync(movieUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        var watchTask = _http.GetAsync(watchUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        await Task.WhenAll(movieTask, watchTask).ConfigureAwait(false);

        double? voteAverage = null;
        int? runtimeMinutes = null;
        using var movieRes = await movieTask.ConfigureAwait(false);
        if (movieRes.IsSuccessStatusCode)
        {
            await using var movieStream = await movieRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var movieDoc = await JsonDocument.ParseAsync(movieStream, cancellationToken: ct).ConfigureAwait(false);
            if (movieDoc.RootElement.TryGetProperty("vote_average", out var va) && va.ValueKind == JsonValueKind.Number)
                voteAverage = va.GetDouble();
            if (movieDoc.RootElement.TryGetProperty("runtime", out var rt) && rt.ValueKind == JsonValueKind.Number)
            {
                var minutes = rt.GetInt32();
                if (minutes > 0)
                    runtimeMinutes = minutes;
            }
        }

        string? watchPageUrl = null;
        var offers = new List<TmdbWatchProviderOffer>();
        using var watchRes = await watchTask.ConfigureAwait(false);
        if (watchRes.IsSuccessStatusCode)
        {
            await using var watchStream = await watchRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var watchDoc = await JsonDocument.ParseAsync(watchStream, cancellationToken: ct).ConfigureAwait(false);
            if (!watchDoc.RootElement.TryGetProperty("results", out var results))
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes);

            if (!results.TryGetProperty(region, out var regionObj) || regionObj.ValueKind != JsonValueKind.Object)
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes);

            if (regionObj.TryGetProperty("link", out var linkEl) && linkEl.ValueKind == JsonValueKind.String)
                watchPageUrl = linkEl.GetString();

            // Uniquement l’abonnement (SVOD) — pas location / achat à l’unité
            AppendProviders(regionObj, "flatrate", "flatrate", offers);
        }

        var deduped = DedupeProviders(offers);
        return new TmdbMovieEnrichment(voteAverage, deduped, watchPageUrl, runtimeMinutes);
    }

    private static void AppendProviders(JsonElement regionObj, string jsonKey, string type, List<TmdbWatchProviderOffer> list)
    {
        if (!regionObj.TryGetProperty(jsonKey, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;

        foreach (var p in arr.EnumerateArray())
        {
            if (!p.TryGetProperty("provider_id", out var idEl) || idEl.ValueKind != JsonValueKind.Number)
                continue;
            var providerId = idEl.GetInt32();
            var name = p.TryGetProperty("provider_name", out var n) && n.ValueKind == JsonValueKind.String
                ? n.GetString() ?? string.Empty
                : string.Empty;
            string? logo = null;
            if (p.TryGetProperty("logo_path", out var lp) && lp.ValueKind == JsonValueKind.String)
            {
                var path = lp.GetString();
                if (!string.IsNullOrEmpty(path))
                    logo = LogoBase + path;
            }

            list.Add(new TmdbWatchProviderOffer(providerId, name, logo, type));
        }
    }

    /// <summary>Garde un type par fournisseur (uniquement offres <c>flatrate</c> collectées aujourd’hui).</summary>
    private static IReadOnlyList<TmdbWatchProviderOffer> DedupeProviders(List<TmdbWatchProviderOffer> offers)
    {
        var best = new Dictionary<int, TmdbWatchProviderOffer>();
        foreach (var o in offers)
        {
            var r = MonetizationRank(o.MonetizationType);
            if (!best.TryGetValue(o.ProviderId, out var cur))
            {
                best[o.ProviderId] = o;
                continue;
            }

            if (r < MonetizationRank(cur.MonetizationType))
                best[o.ProviderId] = o;
        }

        return best.Values.OrderBy(o => MonetizationRank(o.MonetizationType)).ThenBy(o => o.ProviderName).ToList();
    }

    private static int MonetizationRank(string type) =>
        type switch
        {
            "flatrate" => 0,
            "rent" => 1,
            "buy" => 2,
            _ => 99
        };

    /// <summary>
    /// Retourne les détails TMDB d'un film.
    /// <list type="bullet">
    ///   <item><description><c>null</c> si TMDB répond 404 (film inconnu).</description></item>
    ///   <item><description>Lève <see cref="HttpRequestException"/> si TMDB est indisponible (clé manquante, 5xx, timeout, JSON invalide) — à remonter en 503 côté handler.</description></item>
    /// </list>
    /// </summary>
    public async Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new HttpRequestException("TMDB_API_KEY manquante");

        var cacheKey = $"tmdb-details:{tmdbId}";
        var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));

        if (_cache.TryGetValue(cacheKey, out object? boxed) && boxed is TmdbMovieDetails cached)
            return cached;

        try
        {
            var fresh = await FetchDetailsUncachedAsync(tmdbId, ct).ConfigureAwait(false);
            if (fresh is not null)
                _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            return fresh;
        }
        catch (Exception ex) when (
            ex is TaskCanceledException
                or JsonException
                or InvalidOperationException
                or FormatException)
        {
            // Idem : parsing TMDB inattendu → remonte en ServiceUnavailable côté handler.
            _logger.LogWarning(ex, "TMDB détails échoué pour movie {TmdbId}", tmdbId);
            throw new HttpRequestException("TMDB indisponible", ex);
        }
    }

    private async Task<TmdbMovieDetails?> FetchDetailsUncachedAsync(int tmdbId, CancellationToken ct)
    {
        var key = Uri.EscapeDataString(_options.TmdbApiKey!);
        var url = $"https://api.themoviedb.org/3/movie/{tmdbId}?api_key={key}&language=fr-FR&append_to_response=credits";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        var root = doc.RootElement;

        var title = root.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
        var overview = root.TryGetProperty("overview", out var ov) ? ov.GetString() : null;
        var tagline = root.TryGetProperty("tagline", out var tl) ? tl.GetString() : null;
        int? runtime = root.TryGetProperty("runtime", out var rt) && rt.ValueKind == JsonValueKind.Number ? rt.GetInt32() : null;
        var releaseDate = root.TryGetProperty("release_date", out var rd) ? rd.GetString() : null;

        var genres = new List<string>();
        if (root.TryGetProperty("genres", out var genresEl) && genresEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var g in genresEl.EnumerateArray())
            {
                if (g.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String)
                {
                    var name = n.GetString();
                    if (!string.IsNullOrEmpty(name))
                        genres.Add(name);
                }
            }
        }

        string? director = null;
        var cast = new List<string>();
        if (root.TryGetProperty("credits", out var creditsEl) && creditsEl.ValueKind == JsonValueKind.Object)
        {
            if (creditsEl.TryGetProperty("crew", out var crewEl) && crewEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var member in crewEl.EnumerateArray())
                {
                    var job = member.TryGetProperty("job", out var jobEl) ? jobEl.GetString() : null;
                    if (string.Equals(job, "Director", StringComparison.OrdinalIgnoreCase))
                    {
                        director = member.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
                        if (!string.IsNullOrEmpty(director))
                            break;
                    }
                }
            }

            if (creditsEl.TryGetProperty("cast", out var castEl) && castEl.ValueKind == JsonValueKind.Array)
            {
                var i = 0;
                foreach (var actor in castEl.EnumerateArray())
                {
                    if (i++ >= 8)
                        break;
                    if (actor.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
                    {
                        var name = nameEl.GetString();
                        if (!string.IsNullOrEmpty(name))
                            cast.Add(name);
                    }
                }
            }
        }

        return new TmdbMovieDetails(tmdbId, title, overview, tagline, director, cast, runtime, genres, releaseDate);
    }
}

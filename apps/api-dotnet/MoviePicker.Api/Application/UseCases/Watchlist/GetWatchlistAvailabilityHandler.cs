using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public sealed class GetWatchlistAvailabilityHandler : IGetWatchlistAvailabilityHandler
{
    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdbMovieSearch;
    private readonly MoviePickerOptions _options;

    public GetWatchlistAvailabilityHandler(
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdbMovieSearch,
        IOptions<MoviePickerOptions> options)
    {
        _watchlist = watchlist;
        _tmdbMovieSearch = tmdbMovieSearch;
        _options = options.Value;
    }

    public async Task<WatchlistAvailabilityResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        if (!_options.HasTmdbCredentials)
            return new WatchlistAvailabilityResponse();

        var items = await _watchlist.ListPageByUserIdAsync(userId, 0, GetWatchlistHandler.MaxTake, ct);
        if (items.Count == 0)
            return new WatchlistAvailabilityResponse();

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var keys = items.Select(item => (item.TmdbId, item.MediaType)).Distinct().ToList();
        var enrichments = await _tmdbMovieSearch.GetEnrichmentsAsync(keys, region, ct);
        var resolved = items.Where(item => enrichments.ContainsKey((item.TmdbId, item.MediaType))).ToList();

        return new WatchlistAvailabilityResponse
        {
            Items = resolved.Select(item => ToResponse(item, enrichments[(item.TmdbId, item.MediaType)])).ToList(),
            Partial = resolved.Count < items.Count
        };
    }

    private static WatchlistAvailabilityItemResponse ToResponse(WatchlistItem item, TmdbMovieEnrichment? enrichment)
    {
        return new WatchlistAvailabilityItemResponse
        {
            TmdbId = item.TmdbId,
            MediaType = item.MediaType,
            WatchProviders = enrichment is null
                ? Array.Empty<WatchProviderOfferResponse>()
                : WatchProviderMapping.ToDto(enrichment.WatchProviders),
            TmdbWatchPageUrl = enrichment?.TmdbWatchPageUrl,
            VoteAverage = enrichment?.VoteAverage,
            RuntimeMinutes = enrichment?.RuntimeMinutes
        };
    }
}

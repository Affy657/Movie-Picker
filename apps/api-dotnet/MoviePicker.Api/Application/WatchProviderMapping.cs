using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application;

internal static class WatchProviderMapping
{
    public static IReadOnlyList<WatchProviderOfferResponse> ToDto(IReadOnlyList<TmdbWatchProviderOffer> rows) =>
        rows.Select(p => new WatchProviderOfferResponse
        {
            ProviderId = p.ProviderId,
            Name = p.ProviderName,
            LogoPath = p.LogoUrl,
            Type = p.MonetizationType
        })
            .ToList();
}

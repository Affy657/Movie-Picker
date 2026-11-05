using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;

namespace MoviePicker.Api.Infrastructure.Posters;

internal static class PosterRemoteFetch
{
    private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

    internal static async Task<PosterImageBlob?> FetchAsync(
        HttpClient http,
        string sourceUrl,
        int maxBytes,
        CancellationToken ct)
    {
        var fetchUrl = TmdbPosterUrlNormalizer.UpgradeTmdbSize(
            sourceUrl,
            TmdbPosterUrlNormalizer.PreferredPosterSize);
        if (!Uri.TryCreate(fetchUrl, UriKind.Absolute, out var fetchUri)
            || fetchUri.Scheme != Uri.UriSchemeHttps
            || !string.Equals(fetchUri.Host, "image.tmdb.org", StringComparison.OrdinalIgnoreCase))
            return null;

        using var download = CancellationTokenSource.CreateLinkedTokenSource(ct);
        download.CancelAfter(http.Timeout);
        using var res = await http.GetAsync(fetchUri, HttpCompletionOption.ResponseHeadersRead, download.Token);
        if (!res.IsSuccessStatusCode)
            return null;

        var declared = res.Content.Headers.ContentType?.MediaType;
        if (!IsAllowedContentType(declared))
            return null;

        var bytes = await res.Content.ReadAtMostAsync(maxBytes, download.Token);
        return bytes is { Length: > 0 } ? new PosterImageBlob(bytes, declared!) : null;
    }

    private static bool IsAllowedContentType(string? mediaType)
    {
        if (string.IsNullOrWhiteSpace(mediaType))
            return false;
        return AllowedContentTypes.Contains(mediaType, StringComparer.OrdinalIgnoreCase);
    }
}

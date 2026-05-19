using MoviePicker.Api.Application.Ports;

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
        using var res = await http.GetAsync(sourceUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!res.IsSuccessStatusCode)
            return null;

        var declared = res.Content.Headers.ContentType?.MediaType;
        if (!IsAllowedContentType(declared))
            return null;

        var contentLength = res.Content.Headers.ContentLength;
        if (contentLength is > 0 && contentLength > maxBytes)
            return null;

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        await using var ms = new MemoryStream();
        var buffer = new byte[8192];
        var total = 0;
        while (true)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), ct);
            if (read == 0)
                break;
            total += read;
            if (total > maxBytes)
                return null;
            ms.Write(buffer, 0, read);
        }

        if (ms.Length == 0)
            return null;

        return new PosterImageBlob(ms.ToArray(), declared!);
    }

    private static bool IsAllowedContentType(string? mediaType)
    {
        if (string.IsNullOrWhiteSpace(mediaType))
            return false;
        return AllowedContentTypes.Contains(mediaType, StringComparer.OrdinalIgnoreCase);
    }
}

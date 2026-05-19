using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Application.Posters;

public static class TmdbPosterUrlNormalizer
{
    private const string TmdbImageHost = "image.tmdb.org";

    public const string ApiPosterPathPrefix = "/api/v1/posters/";

    public const int PosterKeyHexLength = 64;

    public static bool IsApiPosterPath(string url) => TryParsePosterKey(url, out _);

    public static bool TryParsePosterKey(string? pathOrUrl, out string key)
    {
        key = "";
        if (string.IsNullOrEmpty(pathOrUrl))
            return false;
        var s = pathOrUrl.Trim();
        if (!s.StartsWith(ApiPosterPathPrefix, StringComparison.Ordinal))
            return false;
        key = s[ApiPosterPathPrefix.Length..].ToLowerInvariant();
        if (key.Length != PosterKeyHexLength)
            return false;
        foreach (var c in key)
        {
            if (c is (>= '0' and <= '9') or (>= 'a' and <= 'f'))
                continue;
            return false;
        }

        return true;
    }

    public static bool TryNormalizeToHttpsTmdb(string? url, out string normalized)
    {
        normalized = "";
        if (string.IsNullOrWhiteSpace(url))
            return false;
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u))
            return false;
        if (!string.Equals(u.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.Equals(u.Host, TmdbImageHost, StringComparison.OrdinalIgnoreCase))
            return false;
        var path = u.AbsolutePath;
        if (string.IsNullOrEmpty(path) || !path.StartsWith("/t/p/", StringComparison.Ordinal))
            return false;

        normalized = "https://" + TmdbImageHost + path;
        return true;
    }

    public static string ComputeKey(string normalizedUrl)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedUrl));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static bool IsValidPosterKey(string? key)
    {
        if (string.IsNullOrEmpty(key) || key.Length != PosterKeyHexLength)
            return false;
        foreach (var c in key)
        {
            if (c is (>= '0' and <= '9') or (>= 'a' and <= 'f'))
                continue;
            return false;
        }

        return true;
    }
}

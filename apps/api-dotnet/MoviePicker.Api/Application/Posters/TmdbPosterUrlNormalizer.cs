using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Application.Posters;

public static partial class TmdbPosterUrlNormalizer
{
    private const string TmdbImageHost = "image.tmdb.org";

    public const string ApiPosterPathPrefix = "/api/v1/posters/";

    public const string ApiTmdbPosterPathPrefix = "/api/v1/posters/tmdb/";

    public const int PosterKeyHexLength = 64;

    public const string PreferredPosterSize = "w500";

    private const string TmdbImagePathPrefix = "/t/p/";

    [GeneratedRegex(@"/t/p/(w\d+|original)/", RegexOptions.IgnoreCase)]
    private static partial Regex TmdbSizeSegmentRegex();

    [GeneratedRegex(@"^(w[0-9]{2,4}|original)$", RegexOptions.CultureInvariant)]
    private static partial Regex TmdbStoredSizeRegex();

    [GeneratedRegex(@"^[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$", RegexOptions.CultureInvariant)]
    private static partial Regex TmdbRouteFileRegex();

    public static string UpgradeTmdbSize(string url, string targetSize)
    {
        if (string.IsNullOrEmpty(url))
            return url;
        return TmdbSizeSegmentRegex().Replace(url, $"/t/p/{targetSize}/", 1);
    }

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

    public static bool TryResolveTmdbRoute(string? size, string? file, out string normalizedUrl)
    {
        normalizedUrl = "";
        if (!string.Equals(size, PreferredPosterSize, StringComparison.Ordinal) || string.IsNullOrEmpty(file))
            return false;
        if (!TmdbRouteFileRegex().IsMatch(file))
            return false;

        normalizedUrl = $"https://{TmdbImageHost}{TmdbImagePathPrefix}{size}/{file}";
        return true;
    }

    public static bool TryParseTmdbRoutePath(string? path, out string normalizedUrl)
    {
        normalizedUrl = "";
        if (string.IsNullOrEmpty(path))
            return false;
        var trimmed = path.Trim();
        if (!trimmed.StartsWith(ApiTmdbPosterPathPrefix, StringComparison.Ordinal))
            return false;

        var segments = trimmed[ApiTmdbPosterPathPrefix.Length..].Split('/');
        return segments.Length == 2 && TryResolveTmdbRoute(segments[0], segments[1], out normalizedUrl);
    }

    public static bool TryBuildTmdbRoutePath(string? tmdbUrl, out string path)
    {
        path = "";
        if (!TryNormalizeToHttpsTmdb(tmdbUrl, out var normalized))
            return false;

        var segments = normalized[("https://" + TmdbImageHost + TmdbImagePathPrefix).Length..].Split('/');
        if (segments.Length != 2
            || !TmdbStoredSizeRegex().IsMatch(segments[0])
            || !TryResolveTmdbRoute(PreferredPosterSize, segments[1], out _))
            return false;

        path = $"{ApiTmdbPosterPathPrefix}{PreferredPosterSize}/{segments[1]}";
        return true;
    }

    public static bool IsAcceptedPosterReference(string? posterPath) =>
        TryNormalizeToHttpsTmdb(posterPath, out _)
        || TryParsePosterKey(posterPath, out _)
        || TryParseTmdbRoutePath(posterPath, out _);

    public static string? ToPublicPosterPath(string? posterUrl)
    {
        if (string.IsNullOrWhiteSpace(posterUrl))
            return posterUrl;

        var trimmed = posterUrl.Trim();
        if (TryParsePosterKey(trimmed, out var parsedKey))
            return ApiPosterPathPrefix + parsedKey;

        if (TryParseTmdbRoutePath(trimmed, out _))
            return trimmed;

        return TryBuildTmdbRoutePath(trimmed, out var route) ? route : posterUrl;
    }
}

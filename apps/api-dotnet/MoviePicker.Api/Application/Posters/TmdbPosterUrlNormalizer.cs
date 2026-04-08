using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Application.Posters;

/// <summary>Normalisation des URLs d’affiches TMDB (SSRF-safe) et clé de cache déterministe.</summary>
public static class TmdbPosterUrlNormalizer
{
    private const string TmdbImageHost = "image.tmdb.org";

    /// <summary>Préfixe public des chemins API pour les affiches cachées (doit rester aligné sur le préfixe versionné des contrôleurs).</summary>
    public const string ApiPosterPathPrefix = "/api/v1/posters/";

    /// <summary>Longueur de la clé hex (SHA-256).</summary>
    public const int PosterKeyHexLength = 64;

    public static bool IsApiPosterPath(string url) => TryParsePosterKey(url, out _);

    /// <summary>Vérifie un chemin <c>/api/v1/posters/{64 hex}</c>.</summary>
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

    /// <summary>
    /// Construit une URL canonique <c>https://image.tmdb.org/t/p/…</c> sans query, ou échec si hôte / chemin invalides.
    /// </summary>
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

    /// <summary>Clé SHA-256 hex minuscule de l’URL normalisée.</summary>
    public static string ComputeKey(string normalizedUrl)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedUrl));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Valide une clé hex 64 caractères (a–f, 0–9).</summary>
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

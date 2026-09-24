using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.Posters;

public static class PosterReferences
{
    public static async Task<string?> ToStoredPosterPathAsync(
        this IPosterImageStore store,
        string? posterReference,
        CancellationToken ct = default)
    {
        if (!TmdbPosterUrlNormalizer.TryParsePosterKey(posterReference, out var legacyKey))
            return store.ToPublicPosterPath(posterReference);

        var source = await store.FindSourceUrlAsync(legacyKey, ct);
        return source is not null && TmdbPosterUrlNormalizer.TryBuildTmdbRoutePath(source, out var route)
            ? route
            : null;
    }
}

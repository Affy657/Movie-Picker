using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Posters;

public static class TmdbPosterPathResolver
{
    public static async Task<string?> ResolveAsync(IPosterImageStore store, string? posterPath, CancellationToken ct)
    {
        var poster = string.IsNullOrWhiteSpace(posterPath) ? null : posterPath.Trim();
        if (poster is null)
            return null;

        if (TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(poster, out var normalized))
            await store.RegisterTmdbSourceAsync(normalized, ct);
        else if (!TmdbPosterUrlNormalizer.TryParsePosterKey(poster, out _))
            throw Errors.InvalidPosterPath();

        return store.ToPublicPosterPath(poster);
    }
}

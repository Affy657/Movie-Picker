using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Posters;

public static class TmdbPosterPathResolver
{
    public static async Task<string?> ResolveAsync(IPosterImageStore store, string? posterPath, CancellationToken ct)
    {
        var poster = string.IsNullOrWhiteSpace(posterPath) ? null : posterPath.Trim();
        if (poster is not null && !TmdbPosterUrlNormalizer.IsAcceptedPosterReference(poster))
            throw Errors.InvalidPosterPath();

        return await store.ToStoredPosterPathAsync(poster, ct);
    }
}

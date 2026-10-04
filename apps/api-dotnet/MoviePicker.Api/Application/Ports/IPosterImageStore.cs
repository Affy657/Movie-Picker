namespace MoviePicker.Api.Application.Ports;

public interface IPosterImageStore
{
    string? ToPublicPosterPath(string? posterUrl);

    Task<PosterImageBlob?> GetOrFetchAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default);

    Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default);

    Task<string?> FindSourceUrlAsync(string posterKey, CancellationToken ct = default);
}

public sealed record PosterImageBlob(byte[] Data, string ContentType);

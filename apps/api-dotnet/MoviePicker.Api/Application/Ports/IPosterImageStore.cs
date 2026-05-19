namespace MoviePicker.Api.Application.Ports;

public interface IPosterImageStore
{
    string? ToPublicPosterPath(string? posterUrl);

    Task RegisterTmdbSourceAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default);

    Task RegisterTmdbSourcesAsync(IReadOnlyCollection<string> normalizedTmdbHttpsUrls, CancellationToken ct = default);

    Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default);
}

public sealed record PosterImageBlob(byte[] Data, string ContentType);

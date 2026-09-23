using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Posters;

public sealed class DisabledPosterImageStore : IPosterImageStore
{
    public string? ToPublicPosterPath(string? posterUrl) => posterUrl;

    public Task<PosterImageBlob?> GetOrFetchAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default) =>
        Task.FromResult<PosterImageBlob?>(null);

    public Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default) =>
        Task.FromResult<PosterImageBlob?>(null);

    public Task<string?> FindSourceUrlAsync(string posterKey, CancellationToken ct = default) =>
        Task.FromResult<string?>(null);
}

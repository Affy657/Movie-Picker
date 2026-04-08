using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Posters;

/// <summary>Cache désactivé : URLs TMDB inchangées ; GET affiche → 404.</summary>
public sealed class DisabledPosterImageStore : IPosterImageStore
{
    public string? ToPublicPosterPath(string? posterUrl) => posterUrl;

    public Task RegisterTmdbSourceAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default) =>
        Task.CompletedTask;

    public Task RegisterTmdbSourcesAsync(IReadOnlyCollection<string> normalizedTmdbHttpsUrls, CancellationToken ct = default) =>
        Task.CompletedTask;

    public Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default) =>
        Task.FromResult<PosterImageBlob?>(null);
}

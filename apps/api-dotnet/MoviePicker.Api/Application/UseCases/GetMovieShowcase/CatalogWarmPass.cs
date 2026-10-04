using Microsoft.Extensions.Logging;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public interface ICatalogWarmPass
{
    Task<CatalogWarmPassResult> RunAsync(CancellationToken ct = default);
}

public sealed record CatalogWarmPassResult(int Refreshed, int Failed);

public sealed class CatalogWarmPass : ICatalogWarmPass
{
    private readonly IGetMovieShowcaseHandler _showcase;
    private readonly IGetMovieCollectionsHandler _collections;
    private readonly ILogger<CatalogWarmPass> _logger;

    public CatalogWarmPass(
        IGetMovieShowcaseHandler showcase,
        IGetMovieCollectionsHandler collections,
        ILogger<CatalogWarmPass> logger)
    {
        _showcase = showcase;
        _collections = collections;
        _logger = logger;
    }

    public static IReadOnlyList<MovieShowcaseQuery> CatalogQueries() =>
    [
        new(MovieShowcaseSections.Trending),
        new(MovieShowcaseSections.NowPlaying),
        new(MovieShowcaseSections.MostProposed),
        .. MovieShowcaseCatalog.ThemeKeys.Select(theme => new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: theme)),
        .. MovieShowcaseCatalog.ProviderKeys.Select(provider => new MovieShowcaseQuery(MovieShowcaseSections.Provider, Provider: provider)),
    ];

    public async Task<CatalogWarmPassResult> RunAsync(CancellationToken ct = default)
    {
        var refreshed = 0;
        var failed = 0;
        foreach (var query in CatalogQueries())
        {
            if (await _showcase.RefreshAsync(query, ct))
                refreshed++;
            else
                failed++;
        }

        if (await _collections.RefreshAsync(ct))
            refreshed++;
        else
            failed++;

        if (failed > 0)
            _logger.LogWarning("Catalog warm-up kept {Failed} older snapshot(s), refreshed {Refreshed}", failed, refreshed);
        return new CatalogWarmPassResult(refreshed, failed);
    }
}

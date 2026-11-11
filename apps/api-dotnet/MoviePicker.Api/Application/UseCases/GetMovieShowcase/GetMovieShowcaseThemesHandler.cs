using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed class GetMovieShowcaseThemesHandler : IGetMovieShowcaseThemesHandler
{
    private readonly IGetMovieShowcaseHandler _showcase;
    private readonly ILogger<GetMovieShowcaseThemesHandler> _logger;

    public GetMovieShowcaseThemesHandler(IGetMovieShowcaseHandler showcase, ILogger<GetMovieShowcaseThemesHandler> logger)
    {
        _showcase = showcase;
        _logger = logger;
    }

    public async Task<MovieShowcaseThemeListResponse> HandleAsync(CancellationToken ct = default)
    {
        var loads = await Task.WhenAll(MovieShowcaseCatalog.ThemeKeys.Select(theme => LoadPreviewAsync(theme, ct)));
        if (Array.TrueForAll(loads, load => load.Failed))
            throw Errors.ShowcaseUnavailable();

        return new MovieShowcaseThemeListResponse
        {
            Items = loads
                .Select(load => load.Preview)
                .OfType<MovieShowcaseThemeResponse>()
                .ToList(),
        };
    }

    private async Task<ThemePreviewLoad> LoadPreviewAsync(string theme, CancellationToken ct)
    {
        try
        {
            var list = await _showcase.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: theme), ct);
            var posters = list.Items
                .Where(item => !string.IsNullOrEmpty(item.PosterPath))
                .Take(MovieShowcaseCatalog.PreviewPosterCount)
                .Select(item => new MovieShowcasePosterResponse { Title = item.Title, PosterPath = item.PosterPath! })
                .ToList();
            var preview = posters.Count == 0 ? null : new MovieShowcaseThemeResponse { Theme = theme, Posters = posters };
            return new ThemePreviewLoad(preview, Failed: false);
        }
        catch (Exception ex) when (ex is MoviePickerException or HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Theme {Theme} left out of the previews: its list failed to load", theme);
            return new ThemePreviewLoad(null, Failed: true);
        }
    }

    private sealed record ThemePreviewLoad(MovieShowcaseThemeResponse? Preview, bool Failed);
}

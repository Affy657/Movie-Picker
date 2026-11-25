using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieShare;

public sealed class GetMovieShareDocumentHandler : IGetMovieShareDocumentHandler
{
    public const int DescriptionMaxLength = SharePreviewContent.DescriptionMaxLength;

    private const string MovieType = "video.movie";
    private const string TvShowType = "video.tv_show";

    private readonly ITmdbMovieSearch _tmdb;
    private readonly IPosterImageStore _posters;
    private readonly IWebShellSource _shell;
    private readonly MoviePickerOptions _options;

    public GetMovieShareDocumentHandler(
        ITmdbMovieSearch tmdb,
        IPosterImageStore posters,
        IWebShellSource shell,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _posters = posters;
        _shell = shell;
        _options = options.Value;
    }

    public async Task<ShareDocument> HandleAsync(
        string movieRef,
        MovieMediaType mediaType,
        string apiPublicBaseUrl,
        CatalogLanguage language,
        CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();
        var details = await FindAsync(movieRef, mediaType, language, ct);
        var preview = details is null
            ? SharePreview.Generic(webBase)
            : await DescribeAsync(details, movieRef, mediaType, webBase, apiPublicBaseUrl.Trim().TrimEnd('/'), ct);
        var html = SharePreviewHead.Render(await _shell.GetShellAsync(ct), preview);
        return new ShareDocument(details is null ? 404 : 200, html);
    }

    private async Task<TmdbMovieDetails?> FindAsync(
        string movieRef,
        MovieMediaType mediaType,
        CatalogLanguage language,
        CancellationToken ct)
    {
        if (MovieSlug.TmdbIdOf(movieRef) is not int tmdbId)
            return null;

        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, language, ct);
            return details is null || string.IsNullOrWhiteSpace(details.Title) ? null : details;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private async Task<SharePreview> DescribeAsync(
        TmdbMovieDetails details,
        string movieRef,
        MovieMediaType mediaType,
        string webBase,
        string apiBase,
        CancellationToken ct)
    {
        var canonical = webBase + FrontRoutes.MoviePage(mediaType, movieRef);
        var fallbackUrl = webBase + FrontRoutes.Home;
        var title = TitleWithYear(details);
        var description = Describe(details.Overview, mediaType);
        var ogType = mediaType == MovieMediaType.Tv ? TvShowType : MovieType;

        if (!string.IsNullOrEmpty(details.BackdropUrl))
            return new SharePreview(canonical, fallbackUrl, title, description, details.BackdropUrl, ServerCopy.SharePreviews.ImageOf(details.Title))
            {
                OgType = ogType
            };

        var siteImage = SharePreview.SiteImage(webBase);
        var image = await SharePreviewContent.PosterOrAsync(_posters, details.PosterUrl, apiBase, siteImage, ct);
        var isPoster = image != siteImage;
        return new SharePreview(
            canonical,
            fallbackUrl,
            title,
            description,
            image,
            isPoster ? ServerCopy.SharePreviews.PosterOf(details.Title) : SharePreview.SiteName)
        {
            OgType = ogType,
            PortraitImage = isPoster
        };
    }

    private static string TitleWithYear(TmdbMovieDetails details)
    {
        var year = details.ReleaseDate is { Length: >= 4 } date && date[..4].All(char.IsAsciiDigit) ? date[..4] : null;
        return year is null ? details.Title : $"{details.Title} ({year})";
    }

    private static string Describe(string? overview, MovieMediaType mediaType)
    {
        var text = overview?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return mediaType == MovieMediaType.Tv
                ? ServerCopy.SharePreviews.ShowWithoutOverview
                : ServerCopy.SharePreviews.MovieWithoutOverview;
        }

        return SharePreviewContent.Excerpt(text);
    }
}

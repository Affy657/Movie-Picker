using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventInvitation;

public sealed class GetEventInvitationDocumentHandler : IGetEventInvitationDocumentHandler
{
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IWebShellSource _shell;
    private readonly MoviePickerOptions _options;

    public GetEventInvitationDocumentHandler(
        IEventRepository events,
        IMovieRepository movies,
        IPosterImageStore posterImageStore,
        IWebShellSource shell,
        IOptions<MoviePickerOptions> options)
    {
        _events = events;
        _movies = movies;
        _posterImageStore = posterImageStore;
        _shell = shell;
        _options = options.Value;
    }

    public async Task<ShareDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();
        var evt = await _events.GetByIdOrSlugAsync(slug, ct);
        var preview = evt is null
            ? SharePreview.Generic(webBase)
            : await DescribeAsync(evt, webBase, apiPublicBaseUrl.Trim().TrimEnd('/'), ct);
        var html = SharePreviewHead.Render(await _shell.GetShellAsync(ct), preview);
        return new ShareDocument(evt is null ? 404 : 200, html);
    }

    private async Task<SharePreview> DescribeAsync(Event evt, string webBase, string apiBase, CancellationToken ct)
    {
        var path = FrontRoutes.EventDetail(evt.Slug);
        var canonical = $"{webBase}{path}";
        var fallbackUrl = webBase + FrontRoutes.LoginReturningTo(path);
        var siteImage = SharePreview.SiteImage(webBase);
        if (!(evt.Config ?? EventConfig.SavedWithoutSettings).RichSharePreview)
        {
            return new SharePreview(
                canonical,
                fallbackUrl,
                ServerCopy.SharePreviews.PrivateInvitationTitle,
                ServerCopy.SharePreviews.PrivateInvitationDescription,
                siteImage);
        }

        var when = When(evt);
        IReadOnlyList<Movie> winners = evt.HasWinner ? await WinnerMovies.ListAsync(_movies, evt, ct) : [];
        if (winners.Count == 0)
            return new SharePreview(
                canonical,
                fallbackUrl,
                evt.Title,
                ServerCopy.SharePreviews.Invitation(when, evt.Config?.Theme?.Trim()),
                siteImage);

        var film = winners[0];
        var image = await SharePreviewContent.PosterOrAsync(_posterImageStore, film, apiBase, siteImage, ct);
        return new SharePreview(
            canonical,
            fallbackUrl,
            evt.Title,
            ServerCopy.SharePreviews.Programme(SharePreviewContent.Film(film), when),
            image,
            image == siteImage ? SharePreview.SiteName : ServerCopy.SharePreviews.PosterOf(film.Title));
    }

    private static string When(Event evt)
    {
        if (string.IsNullOrWhiteSpace(evt.Date))
            return string.Empty;
        var day = ServerCopy.SharePreviews.OnDay(SharePreviewContent.Day(evt.Date));
        return string.IsNullOrWhiteSpace(evt.Time) ? day : day + ServerCopy.SharePreviews.AtHour(SharePreviewContent.Hour(evt.Time));
    }
}

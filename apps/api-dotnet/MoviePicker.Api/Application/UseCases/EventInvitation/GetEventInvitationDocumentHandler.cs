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
        var path = $"/e/{evt.Slug}";
        var canonical = $"{webBase}{path}";
        var fallbackUrl = $"{webBase}/login?returnTo={Uri.EscapeDataString(path)}";
        var siteImage = SharePreview.SiteImage(webBase);
        if (!(evt.Config ?? EventConfig.SavedWithoutSettings).RichSharePreview)
        {
            return new SharePreview(
                canonical,
                fallbackUrl,
                "Invitation à une soirée ciné",
                "Tu as reçu une invitation pour une soirée ciné sur Movie Picker. Ouvre le lien pour la rejoindre.",
                siteImage);
        }

        var when = When(evt);
        IReadOnlyList<Movie> winners = evt.HasWinner ? await WinnerMovies.ListAsync(_movies, evt, ct) : [];
        if (winners.Count == 0)
            return new SharePreview(canonical, fallbackUrl, evt.Title, Invitation(evt, when), siteImage);

        var film = winners[0];
        var image = await SharePreviewContent.PosterOrAsync(_posterImageStore, film, apiBase, siteImage, ct);
        return new SharePreview(
            canonical,
            fallbackUrl,
            evt.Title,
            $"Au programme : {SharePreviewContent.Film(film)}{when}.",
            image,
            image == siteImage ? SharePreview.SiteName : $"Affiche de {film.Title}");
    }

    private static string Invitation(Event evt, string when)
    {
        var theme = evt.Config?.Theme?.Trim();
        var themeSentence = string.IsNullOrEmpty(theme) ? string.Empty : $" Thème : {theme}.";
        return $"Soirée ciné{when}.{themeSentence} Rejoins la soirée et vote pour ton film.";
    }

    private static string When(Event evt)
    {
        if (string.IsNullOrWhiteSpace(evt.Date))
            return string.Empty;
        var day = $" le {SharePreviewContent.Day(evt.Date)}";
        return string.IsNullOrWhiteSpace(evt.Time) ? day : $"{day} à {SharePreviewContent.Hour(evt.Time)}";
    }
}

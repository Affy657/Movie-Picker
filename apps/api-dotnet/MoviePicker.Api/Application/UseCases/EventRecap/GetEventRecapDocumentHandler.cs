using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventRecap;

public sealed class GetEventRecapDocumentHandler : IGetEventRecapDocumentHandler
{
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IParticipantRepository _participants;
    private readonly IMovieRatingRepository _ratings;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IWebShellSource _shell;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;

    public GetEventRecapDocumentHandler(
        IEventRepository events,
        IMovieRepository movies,
        IParticipantRepository participants,
        IMovieRatingRepository ratings,
        IPosterImageStore posterImageStore,
        IWebShellSource shell,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock)
    {
        _events = events;
        _movies = movies;
        _participants = participants;
        _ratings = ratings;
        _posterImageStore = posterImageStore;
        _shell = shell;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<ShareDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();
        var evt = await _events.GetByRecapSlugAsync(slug, ct);
        var preview = evt is null
            ? SharePreview.Generic(webBase)
            : await DescribeAsync(evt, webBase, apiPublicBaseUrl.Trim().TrimEnd('/'), ct);
        var html = SharePreviewHead.Render(await _shell.GetShellAsync(ct), preview);
        return new ShareDocument(evt is null ? 404 : 200, html);
    }

    private async Task<SharePreview> DescribeAsync(Event evt, string webBase, string apiBase, CancellationToken ct)
    {
        var canonical = $"{webBase}/r/{evt.RecapSlug}";
        var fallbackUrl = $"{webBase}/";
        var title = $"{evt.Title}, le recap";
        var fallbackImage = SharePreview.SiteImage(webBase);
        IReadOnlyList<Movie> winners = evt.HasWinner ? await WinnerMovies.ListAsync(_movies, evt, ct) : [];
        var first = winners.Count > 0 ? winners[0] : null;
        if (first is null)
        {
            return new SharePreview(
                canonical,
                fallbackUrl,
                title,
                "Le film n'est pas encore choisi. Soirée ciné organisée sur Movie Picker.",
                fallbackImage);
        }

        var participantCount = await _participants.CountByEventIdAsync(evt.Id, ct);
        var ratings = (await _ratings.ListByEventIdAsync(evt.Id, ct))
            .Where(r => r.MovieId == first.Id)
            .Select(r => r.Value)
            .ToList();
        var image = await SharePreviewContent.PosterOrAsync(_posterImageStore, first, apiBase, fallbackImage, ct);
        return new SharePreview(
            canonical,
            fallbackUrl,
            title,
            BuildDescription(evt, first, ratings, participantCount, evt.IsFinished(_clock.GetUtcNow())),
            image,
            image == fallbackImage ? SharePreview.SiteName : $"Affiche de {first.Title}");
    }

    private static string BuildDescription(Event evt, Movie movie, List<int> ratings, int participantCount, bool finished)
    {
        var film = SharePreviewContent.Film(movie);
        var day = SharePreviewContent.Day(evt.Date);
        if (!finished)
            return $"Au programme : {film} le {day}, avec {Participants(participantCount)}.";
        if (ratings.Count == 0)
            return $"On a vu {film} le {day}, avec {Participants(participantCount)}.";

        var average = (ratings.Average() / 2).ToString("0.#", SharePreviewContent.French);
        return $"On a vu {film}, noté {average}/5 par {Participants(ratings.Count)}, le {day}.";
    }

    private static string Participants(int count) =>
        count == 1 ? "1 participant" : $"{count} participants";
}

using System.Globalization;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventRecap;

public sealed class GetEventRecapDocumentHandler : IGetEventRecapDocumentHandler
{
    private static readonly CultureInfo FrCulture = new("fr-FR");

    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IParticipantRepository _participants;
    private readonly IMovieRatingRepository _ratings;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IWebShellSource _shell;
    private readonly MoviePickerOptions _options;

    public GetEventRecapDocumentHandler(
        IEventRepository events,
        IMovieRepository movies,
        IParticipantRepository participants,
        IMovieRatingRepository ratings,
        IPosterImageStore posterImageStore,
        IWebShellSource shell,
        IOptions<MoviePickerOptions> options)
    {
        _events = events;
        _movies = movies;
        _participants = participants;
        _ratings = ratings;
        _posterImageStore = posterImageStore;
        _shell = shell;
        _options = options.Value;
    }

    public async Task<EventRecapDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();
        var evt = await _events.GetByIdOrSlugAsync(slug, ct);
        var preview = evt is null
            ? EventRecapPreview.Generic(webBase)
            : await DescribeAsync(evt, webBase, apiPublicBaseUrl.Trim().TrimEnd('/'), ct);
        var shell = await _shell.GetShellAsync(ct);
        var html = shell is null
            ? EventRecapHead.StandaloneDocument(preview)
            : EventRecapHead.IntoShell(shell, preview);
        return new EventRecapDocument(evt is null ? 404 : 200, html);
    }

    private async Task<EventRecapPreview> DescribeAsync(Event evt, string webBase, string apiBase, CancellationToken ct)
    {
        var canonical = $"{webBase}/r/{evt.Slug}";
        var fallbackUrl = $"{webBase}/e/{evt.Slug}";
        var title = $"{evt.Title}, le recap";
        var fallbackImage = $"{webBase}/og-image.png";
        var first = evt.HasWinner ? (await WinnerMovies.ListAsync(_movies, evt, ct)).FirstOrDefault() : null;
        if (first is null)
        {
            return new EventRecapPreview(
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
        var image = await ResolveImageAsync(first, apiBase, fallbackImage, ct);
        return new EventRecapPreview(
            canonical,
            fallbackUrl,
            title,
            BuildDescription(evt, first, ratings, participantCount),
            image,
            image == fallbackImage ? EventRecapPreview.SiteName : $"Affiche de {first.Title}");
    }

    private static string BuildDescription(Event evt, Movie movie, IReadOnlyList<int> ratings, int participantCount)
    {
        var film = string.IsNullOrWhiteSpace(movie.Year) ? movie.Title : $"{movie.Title} ({movie.Year})";
        var day = DateOnly.TryParse(evt.Date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date.ToString("dddd d MMMM yyyy", FrCulture)
            : evt.Date;
        if (ratings.Count == 0)
            return $"On a vu {film} le {day}, avec {Participants(participantCount)}.";

        var average = (ratings.Average() / 2).ToString("0.#", FrCulture);
        return $"On a vu {film}, noté {average}/5 par {Participants(ratings.Count)}, le {day}.";
    }

    private static string Participants(int count) =>
        count == 1 ? "1 participant" : $"{count} participants";

    private async Task<string> ResolveImageAsync(Movie movie, string apiBase, string fallback, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(movie.PosterPath))
            return fallback;

        if (TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(movie.PosterPath, out var normalized))
            await _posterImageStore.RegisterTmdbSourceAsync(normalized, ct);

        var publicPath = _posterImageStore.ToPublicPosterPath(movie.PosterPath);
        if (string.IsNullOrEmpty(publicPath) || !publicPath.StartsWith('/'))
            return fallback;

        return $"{apiBase}{publicPath}";
    }
}

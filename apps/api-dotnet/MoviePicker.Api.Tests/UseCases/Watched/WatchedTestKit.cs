using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Application.UseCases.Watched;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.UseCases.MovieLists;

namespace MoviePicker.Api.Tests.UseCases.Watched;

internal sealed class WatchedTestKit
{
    public const string Me = "me-1";
    public const string Someone = "someone-1";

    public static readonly DateTimeOffset Start = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    public WatchedTestKit()
    {
        Posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? path) => path);
        Tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
    }

    public InMemoryWatchedTitleRepository Watched { get; } = new();

    public InMemoryWatchlistRepository Watchlist { get; } = new();

    public InMemoryUserRepository Users { get; } = new();

    public InMemoryParticipantRepository Participants { get; } = new();

    public InMemoryEventRepository Events { get; } = new();

    public InMemoryMovieRepository Movies { get; } = new();

    public InMemoryMovieRatingRepository Ratings { get; } = new();

    public Mock<IPosterImageStore> Posters { get; } = new();

    public Mock<ITmdbMovieSearch> Tmdb { get; } = new();

    public SteppingClock Clock { get; } = new(Start);

    public WatchedHistoryReader History => new(Participants, Events, Movies, Ratings, Watched, Clock);

    public MovieListItemFactory Facts => new(Posters.Object, Tmdb.Object, NullLogger<MovieListItemFactory>.Instance);

    public MarkWatchedHandler MarkHandler() => new(Watched, Watchlist, Users, Facts, History, Clock);

    public async Task AccountAsync(string id)
    {
        if (await Users.GetByIdAsync(id) is null)
            await Users.AddAsync(new User { Id = id, Email = $"{id}@test.local", CreatedAt = Start, UpdatedAt = Start });
    }

    public GetWatchedStatusHandler StatusHandler() => new(History);

    public SetWatchedRatingHandler RatingHandler() => new(Watched, History, Clock);

    public UnmarkWatchedHandler UnmarkHandler() => new(Watched);

    public async Task<WatchedStatusResponse> MarkAsync(
        int tmdbId,
        int? rating = null,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string owner = Me)
    {
        await AccountAsync(owner);
        return await MarkHandler().HandleAsync(owner, Title(tmdbId, rating: rating, mediaType: mediaType));
    }

    public Task<WatchedStatusResponse> StatusAsync(
        int tmdbId,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string owner = Me) =>
        StatusHandler().HandleAsync(owner, tmdbId, mediaType);

    public static MarkWatchedRequest Title(
        int tmdbId,
        int? rating = null,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string? posterPath = null,
        IReadOnlyList<int>? genreIds = null,
        int? runtimeMinutes = null,
        double? voteAverage = null) => new()
        {
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "1999",
            PosterPath = posterPath,
            GenreIds = genreIds,
            RuntimeMinutes = runtimeMinutes,
            VoteAverage = voteAverage,
            Rating = rating
        };

    public static DateTimeOffset NightStart(string date)
    {
        EventSchedule.TryGetStartUtc(date, "20:30", out var start);
        return start;
    }

    public async Task<Event> WinNightAsync(
        int tmdbId,
        string date,
        string owner = Me,
        MovieMediaType mediaType = MovieMediaType.Movie,
        int? rating = null,
        string? slug = null,
        bool closed = true)
    {
        var night = await Events.AddAsync(new Event
        {
            Title = $"Soirée du {date}",
            Date = date,
            Time = "20:30",
            Slug = slug ?? $"night-{date}-{tmdbId}",
            CreatedAt = Start,
            UpdatedAt = Start
        });
        var participant = await Participants.AddAsync(new Participant
        {
            EventId = night.Id,
            UserId = owner,
            Pseudo = owner,
            CreatedAt = Start,
            UpdatedAt = Start
        });
        var film = await Movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = participant.Id,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "1999",
            GenreIds = [18],
            CreatedAt = Start,
            UpdatedAt = Start
        });
        if (rating is { } value)
        {
            await Ratings.UpsertAsync(new MovieRating
            {
                EventId = night.Id,
                MovieId = film.Id,
                ParticipantId = participant.Id,
                Value = value,
                CreatedAt = Start,
                UpdatedAt = Start
            });
        }

        return await Events.UpdateAsync(night with
        {
            Winners = TestWinners.Won(film.Id),
            ClosedAt = closed ? NightStart(date).AddHours(3) : null
        });
    }

    public async Task<Event> JoinNightWonByAnotherFilmAsync(int tmdbId, string date, string owner = Me)
    {
        var night = await WinNightAsync(tmdbId + 1, date, owner: Someone);
        var participant = await Participants.AddAsync(new Participant
        {
            EventId = night.Id,
            UserId = owner,
            Pseudo = owner,
            CreatedAt = Start,
            UpdatedAt = Start
        });
        await Movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = participant.Id,
            TmdbId = tmdbId,
            Title = $"Film {tmdbId}",
            Year = "1999",
            CreatedAt = Start,
            UpdatedAt = Start
        });
        return night;
    }
}

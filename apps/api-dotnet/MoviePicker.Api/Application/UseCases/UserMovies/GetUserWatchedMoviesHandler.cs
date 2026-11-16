using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetUserWatchedMoviesHandler : IGetUserWatchedMoviesHandler
{
    private const int DefaultTake = 6;
    private const int MaxTake = 1_000;

    private readonly IUserRepository _users;
    private readonly WatchedHistoryReader _history;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public GetUserWatchedMoviesHandler(
        IUserRepository users,
        WatchedHistoryReader history,
        ITmdbMovieSearch tmdb,
        IOptions<MoviePickerOptions> options)
    {
        _users = users;
        _history = history;
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<UserWatchedMoviesResponse> HandleAsync(
        string handle,
        string? currentUserId,
        int take,
        CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        if (!PublicProfileGuard.CanSeeWatched(user, currentUserId))
            throw Errors.WatchedNotFound();

        return await HandleForUserAsync(user.Id, take, ct);
    }

    public async Task<UserWatchedMoviesResponse> HandleForUserAsync(
        string userId,
        int take,
        CancellationToken ct = default)
    {
        var effectiveTake = take <= 0 ? DefaultTake : Math.Min(take, MaxTake);
        var history = await _history.ReadRatedAsync(userId, ct);
        var page = history.Films.Take(effectiveTake).Select(ToItem).ToList();

        return new UserWatchedMoviesResponse
        {
            Items = await WatchedMoviesFacts.WithTmdbFactsAsync(page, _tmdb, _options, ct),
            Total = history.Films.Count,
        };
    }

    private static UserWatchedMovieItem ToItem(WatchedFilm film) =>
        film.LatestNight is { } night ? FromNight(film, night.Movie) : FromElsewhere(film, film.Elsewhere!);

    private static UserWatchedMovieItem FromNight(WatchedFilm film, Movie movie) => new()
    {
        TmdbId = movie.TmdbId,
        Title = movie.Title,
        Year = movie.Year,
        PosterPath = movie.PosterPath,
        GenreIds = movie.GenreIds,
        MediaType = movie.MediaType,
        WatchedAt = film.WatchedAt,
        MyRating = film.Rating,
        Source = WatchedSource.Night,
    };

    private static UserWatchedMovieItem FromElsewhere(WatchedFilm film, WatchedTitle title) => new()
    {
        TmdbId = title.TmdbId,
        Title = title.Title,
        Year = title.Year,
        PosterPath = title.PosterPath,
        VoteAverage = title.VoteAverage,
        RuntimeMinutes = title.RuntimeMinutes,
        GenreIds = title.GenreIds,
        MediaType = title.MediaType,
        WatchedAt = film.WatchedAt,
        MyRating = film.Rating,
        Source = WatchedSource.Elsewhere,
    };
}

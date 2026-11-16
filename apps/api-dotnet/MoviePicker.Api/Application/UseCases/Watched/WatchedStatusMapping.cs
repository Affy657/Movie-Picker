using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watched;

public static class WatchedStatusMapping
{
    public static async Task<WatchedStatusResponse> ReadStatusAsync(
        this WatchedHistoryReader history,
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct) =>
        ToResponse(await history.ReadRatedFilmAsync(userId, tmdbId, mediaType, ct));

    public static WatchedStatusResponse ToResponse(WatchedFilm? film) => film switch
    {
        null => new WatchedStatusResponse { Status = WatchedStatus.None },
        { LatestNight: { } latest } => new WatchedStatusResponse
        {
            Status = WatchedStatus.Night,
            WatchedAt = film.WatchedAt,
            Rating = film.Rating,
            NightSlug = latest.Night.Slug,
            NightTitle = latest.Night.Title
        },
        _ => new WatchedStatusResponse { Status = WatchedStatus.Elsewhere, WatchedAt = film.WatchedAt, Rating = film.Rating }
    };
}

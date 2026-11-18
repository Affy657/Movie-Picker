using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public static class SavedListTitles
{
    public static MovieListTitle Key(this SavedListTitle title) => new(title.TmdbId, title.MediaType);

    public static SavedListTitle From(MovieListItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        RuntimeMinutes = item.RuntimeMinutes,
        GenreIds = item.GenreIds
    };

    public static MovieListItem ToListItem(this SavedListTitle title, DateTimeOffset addedAt) => new()
    {
        TmdbId = title.TmdbId,
        MediaType = title.MediaType,
        Title = title.Title,
        Year = title.Year,
        PosterPath = title.PosterPath,
        VoteAverage = title.VoteAverage,
        RuntimeMinutes = title.RuntimeMinutes,
        GenreIds = title.GenreIds,
        AddedAt = addedAt
    };
}

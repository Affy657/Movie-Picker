using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public static class MovieListCopies
{
    public static async Task<MovieListResponse> CreateCopyAsync(
        this WatchedHistoryReader history,
        IMovieListRepository lists,
        IUserRepository users,
        string userId,
        string name,
        IEnumerable<MovieListItem> items,
        DateTimeOffset now,
        CancellationToken ct)
    {
        await users.RequireAccountAsync(userId, ct);
        var created = await lists.AddAsync(
            new MovieList
            {
                OwnerId = userId,
                Name = name,
                Items =
                [
                    .. items
                        .DistinctBy(item => (item.TmdbId, item.MediaType))
                        .Take(MovieList.MaxItems)
                ],
                CreatedAt = now,
                UpdatedAt = now
            },
            ct);

        return await history.DescribeDetailAsync(users, created, userId, ct);
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class CreateMovieListHandler : ICreateMovieListHandler
{
    private readonly IMovieListRepository _lists;
    private readonly MovieListItemFactory _items;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public CreateMovieListHandler(
        IMovieListRepository lists,
        MovieListItemFactory items,
        WatchedHistoryReader history,
        IUserRepository users,
        TimeProvider clock)
    {
        _lists = lists;
        _items = items;
        _history = history;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListSummaryResponse> HandleAsync(
        string userId,
        CreateMovieListRequest request,
        CancellationToken ct = default)
    {
        var name = MovieListPolicy.NormalizeName(request.Name);
        var description = MovieListPolicy.NormalizeDescription(request.Description);

        await MovieListPolicy.EnsureRoomForNewListAsync(_lists, userId, name, ct);

        var now = _clock.StorageNow();
        var firstItem = request.FirstItem is null
            ? null
            : await _items.CreateAsync(request.FirstItem, now, ct) with { AddedByUserId = userId };
        var created = await _lists.AddAsync(
            new MovieList
            {
                OwnerId = userId,
                Name = name,
                Description = description,
                IsPublic = request.IsPublic == true,
                Items = firstItem is null ? [] : [firstItem],
                CreatedAt = now,
                UpdatedAt = now
            },
            ct);

        var probe = firstItem is null ? null : new MovieListTitle(firstItem.TmdbId, firstItem.MediaType);
        return await _history.DescribeAsync(_users, created, userId, probe, ct);
    }
}

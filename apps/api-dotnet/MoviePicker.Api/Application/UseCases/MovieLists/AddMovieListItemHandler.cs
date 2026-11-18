using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class AddMovieListItemHandler : IAddMovieListItemHandler
{
    private readonly IMovieListRepository _lists;
    private readonly MovieListItemFactory _items;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public AddMovieListItemHandler(
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

    public async Task<MovieListItemAddition> HandleAsync(
        string userId,
        string listId,
        AddWatchlistItemRequest request,
        CancellationToken ct = default)
    {
        var (list, item, created) = await AddAsync(userId, listId, request, ct);
        var watchedTask = _history.ReadKeysAsync(userId, ct);
        var peopleTask = MovieListPeople.LoadAsync(_users, [list.AuthorOf(item)], ct);
        await Task.WhenAll(watchedTask, peopleTask);
        return new MovieListItemAddition(
            MovieListItemResponse.From(
                item,
                (await watchedTask).Contains(item.TmdbId, item.MediaType),
                (await peopleTask).AuthorOf(list, item)),
            created);
    }

    private async Task<(MovieList List, MovieListItem Item, bool Created)> AddAsync(
        string userId,
        string listId,
        AddWatchlistItemRequest request,
        CancellationToken ct)
    {
        var list = await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
        if (AlreadySettled(list, request) is { } settled)
            return (list, settled, false);

        var item = await _items.CreateAsync(request, _clock.StorageNow(), ct) with { AddedByUserId = userId };
        if (await _lists.AddItemAsync(userId, listId, item, MovieList.MaxItems, ct))
            return (list, item, true);

        var current = await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
        return AlreadySettled(current, request) is { } winner ? (current, winner, false) : throw Errors.ConcurrentUpdate();
    }

    private static MovieListItem? AlreadySettled(MovieList list, AddWatchlistItemRequest request)
    {
        if (list.Find(request.TmdbId, request.MediaType) is { } existing)
            return existing;
        if (list.Items.Count >= MovieList.MaxItems)
            throw Errors.MovieListFull(MovieList.MaxItems);
        return null;
    }
}

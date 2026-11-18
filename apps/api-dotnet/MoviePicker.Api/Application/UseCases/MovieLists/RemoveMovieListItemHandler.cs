using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class RemoveMovieListItemHandler : IRemoveMovieListItemHandler
{
    private readonly IMovieListRepository _lists;
    private readonly TimeProvider _clock;

    public RemoveMovieListItemHandler(IMovieListRepository lists, TimeProvider clock)
    {
        _lists = lists;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, string listId, MovieListTitle title, CancellationToken ct = default)
    {
        if (await _lists.RemoveItemAsync(userId, listId, title, _clock.StorageNow(), ct))
            return;

        await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
    }
}

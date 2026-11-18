using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Application.UseCases.UserMovies;

namespace MoviePicker.Api.Application.UseCases.PublicLists;

public sealed class CopyPublicListHandler : ICopyPublicListHandler
{
    private readonly PublicListReader _publicLists;
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public CopyPublicListHandler(
        PublicListReader publicLists,
        IMovieListRepository lists,
        WatchedHistoryReader history,
        IUserRepository users,
        TimeProvider clock)
    {
        _publicLists = publicLists;
        _lists = lists;
        _history = history;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListResponse> HandleAsync(
        string userId,
        string handle,
        string listId,
        CopySavedListRequest request,
        CancellationToken ct = default)
    {
        var name = MovieListPolicy.NormalizeName(request.Name);
        var source = await _publicLists.RequireAsync(handle, listId, ct);
        await MovieListPolicy.EnsureRoomForNewListAsync(_lists, userId, name, ct);

        var now = _clock.StorageNow();
        return await _history.CreateCopyAsync(
            _lists,
            _users,
            userId,
            name,
            source.List.Items.Select(item => SavedListTitles.From(item).ToListItem(now)),
            now,
            ct);
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class UpdateMovieListHandler : IUpdateMovieListHandler
{
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public UpdateMovieListHandler(
        IMovieListRepository lists,
        WatchedHistoryReader history,
        IUserRepository users,
        TimeProvider clock)
    {
        _lists = lists;
        _history = history;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListSummaryResponse> HandleAsync(
        string userId,
        string listId,
        UpdateMovieListRequest request,
        CancellationToken ct = default)
    {
        var name = MovieListPolicy.NormalizeName(request.Name);
        var description = MovieListPolicy.NormalizeDescription(request.Description);

        var current = await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        await MovieListPolicy.EnsureNameIsFreeAsync(_lists, userId, name, exceptListId: listId, ct);

        var isPublic = request.IsPublic ?? current.IsPublic;
        var updated = await _lists.UpdateDetailsAsync(userId, listId, name, description, isPublic, _clock.StorageNow(), ct)
            ?? throw Errors.MovieListNotFound();
        return await _history.DescribeAsync(_users, updated, userId, probe: null, ct);
    }
}

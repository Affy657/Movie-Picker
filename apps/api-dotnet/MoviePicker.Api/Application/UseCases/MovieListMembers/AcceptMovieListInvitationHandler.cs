using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class AcceptMovieListInvitationHandler : IAcceptMovieListInvitationHandler
{
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public AcceptMovieListInvitationHandler(
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

    public async Task<MovieListSummaryResponse> HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        var list = await _lists.FindAsync(listId, ct) ?? throw Errors.MovieListInvitationNotFound();
        if (list.RoleOf(userId) is null)
            list = await AcceptAsync(list, userId, ct);

        return await _history.DescribeAsync(_users, list, userId, probe: null, ct);
    }

    private async Task<MovieList> AcceptAsync(MovieList list, string userId, CancellationToken ct)
    {
        if (!list.IsInvited(userId))
            throw Errors.MovieListInvitationNotFound();
        await _lists.AcceptInvitationAsync(list.Id, new MovieListMember(userId, _clock.StorageNow()), ct);
        return await _lists.GetAsync(userId, list.Id, ct) ?? throw Errors.MovieListInvitationNotFound();
    }
}

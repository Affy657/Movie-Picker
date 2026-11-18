using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class JoinMovieListHandler : IJoinMovieListHandler
{
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public JoinMovieListHandler(
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

    public async Task<MovieListJoin> HandleAsync(string userId, string token, CancellationToken ct = default)
    {
        var list = await MovieListInviteLinks.FindAsync(_lists, token, ct) ?? throw Errors.MovieListInviteLinkInvalid();
        if (list.RoleOf(userId) is not null)
            return await AnswerAsync(list, userId, joined: false, ct);

        var now = _clock.StorageNow();
        if (!list.AcceptsInviteToken(token, now))
            throw Errors.MovieListInviteLinkInvalid();
        if (await _lists.JoinByInviteTokenAsync(token, new MovieListMember(userId, now), now, MovieList.MaxMembers, ct))
            return await AnswerAsync(await _lists.GetAsync(userId, list.Id, ct) ?? list, userId, joined: true, ct);

        var current = await MovieListInviteLinks.FindAsync(_lists, token, ct);
        if (current?.RoleOf(userId) is not null)
            return await AnswerAsync(current, userId, joined: false, ct);
        if (current is null || !current.AcceptsInviteToken(token, now))
            throw Errors.MovieListInviteLinkInvalid();
        throw current.IsFull(now) && !current.IsInvited(userId, now)
            ? Errors.MovieListMembersLimitReached(MovieList.MaxMembers)
            : Errors.ConcurrentUpdate();
    }

    private async Task<MovieListJoin> AnswerAsync(MovieList list, string userId, bool joined, CancellationToken ct) =>
        new(await _history.DescribeAsync(_users, list, userId, probe: null, ct), joined);
}

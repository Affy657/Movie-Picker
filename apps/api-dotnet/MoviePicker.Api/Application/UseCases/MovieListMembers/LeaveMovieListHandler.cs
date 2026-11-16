using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class LeaveMovieListHandler : ILeaveMovieListHandler
{
    private readonly IMovieListRepository _lists;

    public LeaveMovieListHandler(IMovieListRepository lists)
    {
        _lists = lists;
    }

    public async Task HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
        if (list.OwnerId == userId)
            throw Errors.MovieListOwnerCannotLeave();
        await _lists.RemoveMemberAsync(listId, userId, disableInviteLink: false, ct);
    }
}

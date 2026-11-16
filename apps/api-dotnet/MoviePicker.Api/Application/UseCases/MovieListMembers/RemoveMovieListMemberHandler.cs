using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class RemoveMovieListMemberHandler : IRemoveMovieListMemberHandler
{
    private readonly IMovieListRepository _lists;

    public RemoveMovieListMemberHandler(IMovieListRepository lists)
    {
        _lists = lists;
    }

    public async Task HandleAsync(string userId, string listId, string memberId, CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        if (memberId == list.OwnerId)
            throw Errors.MovieListOwnerCannotLeave();
        await _lists.RemoveMemberAsync(listId, memberId, disableInviteLink: true, ct);
    }
}

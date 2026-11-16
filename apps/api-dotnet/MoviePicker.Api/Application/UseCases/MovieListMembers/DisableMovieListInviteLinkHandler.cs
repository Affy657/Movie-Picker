using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class DisableMovieListInviteLinkHandler : IDisableMovieListInviteLinkHandler
{
    private readonly IMovieListRepository _lists;

    public DisableMovieListInviteLinkHandler(IMovieListRepository lists)
    {
        _lists = lists;
    }

    public async Task HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        await _lists.DisableInviteLinkAsync(userId, listId, ct);
    }
}

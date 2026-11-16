using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class DeclineMovieListInvitationHandler : IDeclineMovieListInvitationHandler
{
    private readonly IMovieListRepository _lists;

    public DeclineMovieListInvitationHandler(IMovieListRepository lists)
    {
        _lists = lists;
    }

    public Task HandleAsync(string userId, string listId, CancellationToken ct = default) =>
        _lists.RemoveInvitationAsync(listId, userId, ct);
}

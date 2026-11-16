using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class CancelMovieListInvitationHandler : ICancelMovieListInvitationHandler
{
    private readonly IMovieListRepository _lists;
    private readonly IUserNotificationRepository _notifications;

    public CancelMovieListInvitationHandler(IMovieListRepository lists, IUserNotificationRepository notifications)
    {
        _lists = lists;
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, string listId, string inviteeId, CancellationToken ct = default)
    {
        await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        if (await _lists.RemoveInvitationAsync(listId, inviteeId, ct))
            await _notifications.DeleteByListAsync(listId, inviteeId, ct);
    }
}

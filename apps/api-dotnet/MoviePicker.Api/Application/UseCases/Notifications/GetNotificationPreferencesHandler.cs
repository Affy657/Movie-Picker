using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class GetNotificationPreferencesHandler : IGetNotificationPreferencesHandler
{
    private readonly IUserRepository _users;

    public GetNotificationPreferencesHandler(IUserRepository users)
    {
        _users = users;
    }

    public async Task<NotificationPreferencesResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

        return new NotificationPreferencesResponse
        {
            NotifyOnParticipantJoined = user.NotifyOnParticipantJoined,
            NotifyEventReminder = user.NotifyEventReminder,
            NotifyOnMovieAdded = user.NotifyOnMovieAdded,
            NotifyOnMoviePicked = user.NotifyOnMoviePicked,
            NotifyOnEventDeleted = user.NotifyOnEventDeleted
        };
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class PatchNotificationPreferencesHandler : IPatchNotificationPreferencesHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public PatchNotificationPreferencesHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<NotificationPreferencesResponse> HandleAsync(
        string userId,
        PatchNotificationPreferencesRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

        var updated = user with
        {
            NotifyOnParticipantJoined = request.NotifyOnParticipantJoined ?? user.NotifyOnParticipantJoined,
            NotifyEventReminder = request.NotifyEventReminder ?? user.NotifyEventReminder,
            NotifyOnMovieAdded = request.NotifyOnMovieAdded ?? user.NotifyOnMovieAdded,
            NotifyOnMoviePicked = request.NotifyOnMoviePicked ?? user.NotifyOnMoviePicked,
            NotifyOnEventDeleted = request.NotifyOnEventDeleted ?? user.NotifyOnEventDeleted,
            UpdatedAt = _clock.GetUtcNow()
        };

        await _users.UpdateAsync(updated, ct);

        return new NotificationPreferencesResponse
        {
            NotifyOnParticipantJoined = updated.NotifyOnParticipantJoined,
            NotifyEventReminder = updated.NotifyEventReminder,
            NotifyOnMovieAdded = updated.NotifyOnMovieAdded,
            NotifyOnMoviePicked = updated.NotifyOnMoviePicked,
            NotifyOnEventDeleted = updated.NotifyOnEventDeleted
        };
    }
}

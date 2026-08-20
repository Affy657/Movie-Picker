using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
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
            Preferences = Enum.GetValues<UserNotificationType>()
                .Select(type => new NotificationTypePreference
                {
                    Type = type.ToString().ToLowerInvariant(),
                    Enabled = user.NotifiesOn(type)
                })
                .ToList()
        };
    }
}

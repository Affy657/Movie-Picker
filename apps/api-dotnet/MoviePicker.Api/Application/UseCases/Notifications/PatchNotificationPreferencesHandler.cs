using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
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

        var merged = new Dictionary<UserNotificationType, bool>(
            Enum.GetValues<UserNotificationType>().ToDictionary(t => t, user.NotifiesOn));

        foreach (var patch in request.Preferences)
        {
            if (!Enum.TryParse<UserNotificationType>(patch.Type, ignoreCase: true, out var type))
                throw new BadRequestException($"Type de notification inconnu : « {patch.Type} »");
            if (patch.Enabled is null)
                throw new BadRequestException($"« enabled » est requis pour le type « {patch.Type} »");
            merged[type] = patch.Enabled.Value;
        }

        var updated = user with { NotificationPreferences = merged, UpdatedAt = _clock.GetUtcNow() };
        await _users.UpdateAsync(updated, ct);

        return new NotificationPreferencesResponse
        {
            Preferences = Enum.GetValues<UserNotificationType>()
                .Select(type => new NotificationTypePreference
                {
                    Type = type.ToString().ToLowerInvariant(),
                    Enabled = updated.NotifiesOn(type)
                })
                .ToList()
        };
    }
}

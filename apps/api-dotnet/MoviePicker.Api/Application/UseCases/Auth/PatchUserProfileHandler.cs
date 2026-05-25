using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class PatchUserProfileHandler : IPatchUserProfileHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public PatchUserProfileHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<UserProfileResponse> HandleAsync(
        string userId,
        PatchUserProfileRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

        if (request.DisplayName is null && request.UiTheme is null && request.AccentColor is null && request.AvatarId is null)
        {
            return new UserProfileResponse
            {
                UserId = user.Id,
                DisplayName = user.DisplayName,
                EmailMasked = EmailMasking.Mask(user.Email),
                UiTheme = user.UiTheme,
                AccentColor = user.AccentColor,
                AvatarId = user.AvatarId
            };
        }

        var displayName = user.DisplayName;
        if (request.DisplayName is not null)
        {
            var err = AuthInputValidation.ValidateDisplayName(request.DisplayName);
            if (err is not null)
                throw new BadRequestException(err);
            displayName = request.DisplayName.Trim();
        }

        var theme = user.UiTheme;
        if (request.UiTheme is not null)
            theme = ParseEnum(request.UiTheme, UiThemePreference.System);

        var accent = user.AccentColor;
        if (request.AccentColor is not null)
            accent = ParseEnum(request.AccentColor, AccentColor.Default);

        var avatarId = request.AvatarId ?? user.AvatarId;

        var updated = user with
        {
            DisplayName = displayName,
            UiTheme = theme,
            AccentColor = accent,
            AvatarId = avatarId,
            UpdatedAt = _clock.GetUtcNow()
        };

        var saved = await _users.UpdateAsync(updated, ct);
        return new UserProfileResponse
        {
            UserId = saved.Id,
            DisplayName = saved.DisplayName,
            EmailMasked = EmailMasking.Mask(saved.Email),
            UiTheme = saved.UiTheme,
            AccentColor = saved.AccentColor,
            AvatarId = saved.AvatarId
        };
    }

    private static T ParseEnum<T>(string raw, T defaultValue) where T : struct, Enum =>
        Enum.TryParse<T>(raw, ignoreCase: true, out var result) ? result : defaultValue;
}

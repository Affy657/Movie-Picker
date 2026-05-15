using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class PatchUserProfileHandler : IPatchUserProfileHandler
{
    private readonly IUserRepository _users;

    public PatchUserProfileHandler(IUserRepository users) => _users = users;

    public async Task<UserProfileResponse> HandleAsync(
        string userId,
        PatchUserProfileRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable");

        if (request.DisplayName is null && request.UiTheme is null && request.AccentColor is null)
        {
            return new UserProfileResponse
            {
                UserId = user.Id,
                DisplayName = user.DisplayName,
                EmailMasked = EmailMasking.Mask(user.Email),
                UiTheme = user.UiTheme,
                AccentColor = user.AccentColor
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
            theme = ParseTheme(request.UiTheme);

        var accent = user.AccentColor;
        if (request.AccentColor is not null)
            accent = ParseAccent(request.AccentColor);

        var updated = user with
        {
            DisplayName = displayName,
            UiTheme = theme,
            AccentColor = accent,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var saved = await _users.UpdateAsync(updated, ct);
        return new UserProfileResponse
        {
            UserId = saved.Id,
            DisplayName = saved.DisplayName,
            EmailMasked = EmailMasking.Mask(saved.Email),
            UiTheme = saved.UiTheme,
            AccentColor = saved.AccentColor
        };
    }

    private static UiThemePreference ParseTheme(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "light" => UiThemePreference.Light,
            "dark" => UiThemePreference.Dark,
            _ => UiThemePreference.System
        };

    private static AccentColor ParseAccent(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "blue" => AccentColor.Blue,
            "green" => AccentColor.Green,
            "purple" => AccentColor.Purple,
            "pink" => AccentColor.Pink,
            "orange" => AccentColor.Orange,
            _ => AccentColor.Default
        };
}

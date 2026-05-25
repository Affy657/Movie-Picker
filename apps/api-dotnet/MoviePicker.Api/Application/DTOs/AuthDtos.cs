using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class RegisterRequest
{
    [Required(ErrorMessage = "L'e-mail est requis.")]
    [EmailAddress(ErrorMessage = "Format d'e-mail invalide.")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "Le mot de passe est requis.")]
    [MinLength(1)]
    public string Password { get; init; } = string.Empty;

    [Required(ErrorMessage = "Le pseudo est requis.")]
    [MaxLength(80)]
    public string DisplayName { get; init; } = string.Empty;
}

public sealed class RegisterResponse
{
    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required(ErrorMessage = "L'e-mail est requis.")]
    [EmailAddress(ErrorMessage = "Format d'e-mail invalide.")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "Le mot de passe est requis.")]
    public string Password { get; init; } = string.Empty;
}

public sealed class LoginResponse
{
    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
}

public sealed class UserProfileResponse
{
    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;

    public string EmailMasked { get; init; } = string.Empty;
    public UiThemePreference UiTheme { get; init; }
    public AccentColor AccentColor { get; init; }
    public string AvatarId { get; init; } = string.Empty;
}

public sealed class PatchUserProfileRequest
{
    [MaxLength(80)]
    public string? DisplayName { get; init; }

    [RegularExpression("^(system|light|dark)$", ErrorMessage = "uiTheme doit être system, light ou dark.")]
    public string? UiTheme { get; init; }

    [RegularExpression(
        "^(default|blue|green|purple|pink|orange)$",
        ErrorMessage = "accentColor doit être default, blue, green, purple, pink ou orange.")]
    public string? AccentColor { get; init; }

    // Seeds must match AVATAR_IDS in apps/web/src/shared/utils/avatar.ts
    [RegularExpression(
        "^(alpha|beta|bolt|byte|crux|delta|flux|forge|gamma|jolt|kilo|laser)$",
        ErrorMessage = "avatarId invalide.")]
    public string? AvatarId { get; init; }
}

public sealed class ChangePasswordRequest
{
    [Required(ErrorMessage = "Le mot de passe actuel est requis.")]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required(ErrorMessage = "Le nouveau mot de passe est requis.")]
    [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères.")]
    public string NewPassword { get; init; } = string.Empty;
}

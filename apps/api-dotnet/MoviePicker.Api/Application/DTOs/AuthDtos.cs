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
    public string Email { get; init; } = string.Empty;
    public UiThemePreference UiTheme { get; init; }
    public AccentColor AccentColor { get; init; }
    public RatingScale RatingScale { get; init; }
    public string AvatarId { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public bool IsProfilePublic { get; init; } = true;
    public string? LetterboxdUsername { get; init; }
    public DateTimeOffset? LetterboxdLastSyncAt { get; init; }
    public string? LetterboxdLastSyncError { get; init; }
    public int LetterboxdPendingReconciliationCount { get; init; }
    public bool HasPassword { get; init; } = true;
    public IReadOnlyList<string> LinkedProviders { get; init; } = Array.Empty<string>();
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed class PatchUserProfileRequest
{
    [MaxLength(80)]
    public string? DisplayName { get; init; }

    [RegularExpression("^(system|light|dark)$", ErrorMessage = "uiTheme doit être system, light ou dark.")]
    public string? UiTheme { get; init; }

    [RegularExpression(
        "^(default|blue|green|purple|pink|orange|red|cyan|indigo)$",
        ErrorMessage = "accentColor doit être default, blue, green, purple, pink, orange, red, cyan ou indigo.")]
    public string? AccentColor { get; init; }

    [RegularExpression("^(five|ten)$", ErrorMessage = "ratingScale doit être five ou ten.")]
    public string? RatingScale { get; init; }

    [RegularExpression(
        "^(alpha|beta|bolt|byte|crux|delta|flux|forge|gamma|jolt|kilo|laser|dex|sigma|droid|theta|chip|vibe|cute|wink|hero|halo|grin|cool|keen|jazz|fizz|zest|bold|epic|bask|nod|glow|zoom|snap|luxe)$",
        ErrorMessage = "avatarId invalide.")]
    public string? AvatarId { get; init; }

    [MaxLength(20, ErrorMessage = "Handle trop long.")]
    public string? Handle { get; init; }

    [MaxLength(140, ErrorMessage = "La bio ne peut pas dépasser 140 caractères.")]
    public string? Bio { get; init; }

    public bool? IsProfilePublic { get; init; }

    [MaxLength(40, ErrorMessage = "Le pseudo Letterboxd est trop long.")]
    public string? LetterboxdUsername { get; init; }
}

public sealed class ChangePasswordRequest
{
    public string? CurrentPassword { get; init; }

    [Required(ErrorMessage = "Le nouveau mot de passe est requis.")]
    [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères.")]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed class DeleteAccountRequest
{
    public string? Password { get; init; }

    public string? Confirmation { get; init; }
}

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
    [JsonPropertyName("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonPropertyName("displayName")]
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
    [JsonPropertyName("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; init; } = string.Empty;
}

public sealed class UserProfileResponse
{
    [JsonPropertyName("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; init; } = string.Empty;

    /// <summary>E-mail partiellement masqué (aperçu compte).</summary>
    [JsonPropertyName("emailMasked")]
    public string EmailMasked { get; init; } = string.Empty;

    [JsonPropertyName("uiTheme")]
    public UiThemePreference UiTheme { get; init; }
}

public sealed class PatchUserProfileRequest
{
    [MaxLength(80)]
    public string? DisplayName { get; init; }

    /// <summary>system | light | dark</summary>
    [RegularExpression("^(system|light|dark)$", ErrorMessage = "uiTheme doit être system, light ou dark.")]
    public string? UiTheme { get; init; }
}

namespace MoviePicker.Api.Application.DTOs;

/// <summary>Demande d'envoi d'un email de reset password.</summary>
public sealed record PasswordResetRequest
{
    /// <summary>Email du compte (toujours retourné 202 même si inconnu — anti-énumération).</summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>Locale pour le contenu de l'email ("fr" ou "en"). Optionnel, fallback "fr".</summary>
    public string? Locale { get; init; }
}

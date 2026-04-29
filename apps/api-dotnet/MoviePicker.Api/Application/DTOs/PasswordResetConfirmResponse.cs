namespace MoviePicker.Api.Application.DTOs;

/// <summary>Réponse de confirmation de reset password : pas d'auto-login, l'utilisateur doit se reconnecter.</summary>
public sealed record PasswordResetConfirmResponse
{
    /// <summary>Message de succès localisé côté API (FR par défaut).</summary>
    public string Message { get; init; } = string.Empty;
}

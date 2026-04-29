namespace MoviePicker.Api.Application.DTOs;

/// <summary>Confirmation de reset password via token reçu par email.</summary>
public sealed record PasswordResetConfirmRequest
{
    /// <summary>Token clair reçu dans l'email (base64url).</summary>
    public string Token { get; init; } = string.Empty;

    /// <summary>Nouveau mot de passe (validé par AuthInputValidation.ValidatePassword).</summary>
    public string NewPassword { get; init; } = string.Empty;
}

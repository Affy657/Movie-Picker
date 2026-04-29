using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public interface IRequestPasswordResetHandler
{
    /// <summary>
    /// Toujours retourne (Task non-throwing) — silencieux sur user inconnu et sur erreur d'envoi
    /// (anti-énumération + UX uniforme). Les paramètres clientIp / userAgent sont utilisés pour l'audit
    /// dans le PasswordResetToken stocké, mais jamais loggés en clair côté serveur.
    /// </summary>
    Task HandleAsync(
        PasswordResetRequest request,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default);
}

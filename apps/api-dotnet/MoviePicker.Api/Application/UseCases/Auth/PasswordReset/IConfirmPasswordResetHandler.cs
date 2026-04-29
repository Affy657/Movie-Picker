using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public interface IConfirmPasswordResetHandler
{
    /// <summary>
    /// Vérifie le token, hash le nouveau mot de passe, met à jour l'utilisateur, marque le token consommé,
    /// invalide les autres tokens actifs et toutes les sessions actives. Pas d'auto-login : le client devra se reconnecter.
    /// </summary>
    /// <exception cref="MoviePicker.Api.Domain.Exceptions.BadRequestException">
    /// Token invalide / expiré / consommé, ou password ne respecte pas la politique.
    /// </exception>
    Task<PasswordResetConfirmResponse> HandleAsync(PasswordResetConfirmRequest request, CancellationToken ct = default);
}

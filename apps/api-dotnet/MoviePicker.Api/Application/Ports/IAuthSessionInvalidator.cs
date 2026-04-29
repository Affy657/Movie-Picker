namespace MoviePicker.Api.Application.Ports;

/// <summary>Invalide toutes les sessions actives d'un utilisateur (post-reset password, etc.).</summary>
public interface IAuthSessionInvalidator
{
    /// <returns>Nombre de sessions invalidées (best-effort).</returns>
    Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default);
}

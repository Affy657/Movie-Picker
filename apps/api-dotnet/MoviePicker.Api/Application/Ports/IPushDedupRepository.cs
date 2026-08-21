using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

/// <summary>
/// Déduplication de l'envoi push, indépendante de la notification in-app : un rappel ne doit
/// partir en push qu'une seule fois par (utilisateur, type, événement), même si l'in-app est
/// désactivé pour ce type ou si le job qui envoie le rappel repasse dans sa fenêtre.
/// </summary>
public interface IPushDedupRepository
{
    /// <summary>
    /// Tente de réclamer l'envoi. Renvoie <c>true</c> la première fois (l'appelant doit envoyer
    /// le push), <c>false</c> si déjà réclamé auparavant (ne pas renvoyer).
    /// </summary>
    Task<bool> TryClaimAsync(string userId, UserNotificationType type, string eventId, CancellationToken ct = default);
}

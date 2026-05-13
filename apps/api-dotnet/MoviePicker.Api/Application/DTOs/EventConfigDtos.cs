using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventConfigResponse
{
    public string? Theme { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    /// <summary>Capacité maximale de participants (hôte inclus). <see langword="null"/> = pas de limite.</summary>
    public int? MaxParticipants { get; init; }

    public WheelMode WheelMode { get; init; }

    /// <summary>
    /// Aperçu Open Graph « riche » (titre soirée + détails). Les nouvelles soirées sont
    /// créées avec ce flag à <see langword="true"/> (cf. <c>CreateEventHandler</c>) ; l'hôte
    /// peut le désactiver depuis les paramètres. Pour les soirées historiques sans <c>Config</c>
    /// persistée, on retombe également sur <see langword="true"/> pour cohérence d'affichage.
    /// </summary>
    public bool RichSharePreview { get; init; }

    public static EventConfigResponse FromEvent(Event evt)
    {
        var c = evt.Config;
        return new EventConfigResponse
        {
            Theme = c?.Theme,
            EndDate = c?.EndDate,
            MaxProposalsPerParticipant = c?.MaxProposalsPerParticipant,
            MaxParticipants = c?.MaxParticipants,
            WheelMode = c?.WheelMode ?? WheelMode.StrictRandom,
            RichSharePreview = c?.RichSharePreview ?? true
        };
    }
}

/// <summary>
/// PATCH partiel : propriétés absentes ou nulles sans effet, sauf <see cref="Theme"/> non null (chaîne vide efface),
/// <see cref="EndDate"/> non null (chaîne vide efface, sinon date ISO 8601),
/// <see cref="MaxProposalsPerParticipant"/> présent : 0 = pas de limite, 1–100 = plafond,
/// <see cref="MaxParticipants"/> présent : 0 = pas de limite, 1–500 = capacité.
/// </summary>
public sealed class PatchEventConfigRequest
{
    public string? Theme { get; init; }

    /// <summary>ISO 8601 ou chaîne vide pour effacer la date de fin personnalisée.</summary>
    public string? EndDate { get; init; }

    public int? MaxProposalsPerParticipant { get; init; }

    /// <summary>Capacité maximale de participants. 0 = pas de limite, 1–500 sinon.</summary>
    public int? MaxParticipants { get; init; }

    public WheelMode? WheelMode { get; init; }

    /// <summary>Si présent, active ou désactive l’aperçu de partage détaillé (Open Graph).</summary>
    public bool? RichSharePreview { get; init; }
}

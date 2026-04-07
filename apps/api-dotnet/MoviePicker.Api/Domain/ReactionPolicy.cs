using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

/// <summary>Règles d’éligibilité d’une réaction selon <see cref="EventConfig.AllowedReactionIds"/> (V1 §5–6).</summary>
public static class ReactionPolicy
{
    /// <summary>
    /// <see langword="null"/> sur la liste = toutes les réactions du <see cref="ReactionCatalog"/> ;
    /// liste vide = aucune réaction autorisée.
    /// </summary>
    public static bool IsAllowed(EventConfig? config, string reactionId)
    {
        if (!ReactionCatalog.IsKnown(reactionId))
            return false;

        var allowed = config?.AllowedReactionIds;
        if (allowed is null)
            return true;

        return allowed.Contains(reactionId, StringComparer.Ordinal);
    }
}

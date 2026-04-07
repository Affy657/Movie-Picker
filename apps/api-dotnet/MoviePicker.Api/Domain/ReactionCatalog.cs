namespace MoviePicker.Api.Domain;

/// <summary>Clés stables pour les réactions V1 (config hôte §5, endpoints réactions §6).</summary>
public static class ReactionCatalog
{
    public static readonly IReadOnlySet<string> KnownIds = new HashSet<string>(StringComparer.Ordinal)
    {
        "already_seen",
        "want_to_watch",
        "not_interested",
        "masterpiece",
        "meh"
    };

    public static bool IsKnown(string id) => KnownIds.Contains(id);
}

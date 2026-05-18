namespace MoviePicker.Api.Domain.Entities;

public sealed record Event
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string HostToken { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;

    /// <summary>Créateur connecté (V1). Les hôtes sans compte restent identifiés par <see cref="HostToken"/> uniquement.</summary>
    public string? CreatorUserId { get; init; }

    public EventConfig? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    /// <summary>
    /// Terminé si clôturé, ou si date/heure de fin (event ou config.endDate) dépassée.
    /// </summary>
    public bool IsFinished(DateTimeOffset utcNow)
    {
        if (ClosedAt.HasValue)
            return true;

        if (Config?.EndDate is { } endDate)
            return utcNow >= endDate;

        if (DateTimeOffset.TryParse($"{Date}T{Time}:00Z", null, System.Globalization.DateTimeStyles.AssumeUniversal, out var end))
            return utcNow >= end;

        return false;
    }
}

public sealed record EventConfig
{
    /// <summary>Plafond supérieur absolu pour <see cref="MaxParticipants"/> (validation côté API).</summary>
    public const int MaxParticipantsCap = 500;

    /// <summary>Plafond supérieur absolu pour <see cref="MaxProposalsPerParticipant"/>.</summary>
    public const int MaxProposalsPerParticipantCap = 100;

    public string? Theme { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    /// <summary>Capacité maximale de participants (hôte inclus). <see langword="null"/> = pas de limite.</summary>
    public int? MaxParticipants { get; init; }

    /// <summary>Mode de tirage roue. Défaut : <see cref="WheelMode.StrictRandom"/>.</summary>
    public WheelMode WheelMode { get; init; } = WheelMode.StrictRandom;

    /// <summary>
    /// Si <see langword="true"/>, la page <c>share-preview</c> expose titre, texte et éventuelle affiche du film gagnant aux crawlers (aperçu « riche »). Défaut : <see langword="false"/> (aperçu générique, lien privé).
    /// </summary>
    public bool RichSharePreview { get; init; }

    /// <summary>
    /// Si <see langword="true"/>, l'hôte autorise les séries TV (TMDB <c>tv</c>) en plus des films lors de la recherche et de l'ajout de propositions. Défaut : <see langword="false"/> (films uniquement).
    /// </summary>
    public bool AllowSeries { get; init; }
}

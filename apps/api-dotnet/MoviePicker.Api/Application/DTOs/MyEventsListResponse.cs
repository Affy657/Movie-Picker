namespace MoviePicker.Api.Application.DTOs;

public sealed class MyEventsListResponse
{
    public IReadOnlyList<MyEventSummaryDto> Events { get; init; } = Array.Empty<MyEventSummaryDto>();
}

public sealed class MyEventSummaryDto
{
    public string Id { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsCreator { get; init; }
    public bool IsParticipant { get; init; }

    /// <summary><c>upcoming</c> | <c>live</c> | <c>finished</c> — affichage liste « mes soirées ».</summary>
    public string Lifecycle { get; init; } = string.Empty;

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    /// <summary>
    /// Capacité maximale configurée par l’hôte (1..500) ; <c>null</c> = capacité illimitée.
    /// Permet à la liste « Mes soirées » d’afficher « N / max » sans charger la config détaillée.
    /// </summary>
    public int? MaxParticipants { get; init; }

    /// <summary>Thème/ambiance configuré par l’hôte (ex. "🎃 Horreur") ; <c>null</c> = aucun.</summary>
    public string? Theme { get; init; }
}

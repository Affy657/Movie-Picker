using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventDetailResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    /// <summary>Toujours renseigné (valeurs par défaut si aucun document <c>config</c> en base).</summary>
    public required EventConfigResponse Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsHost { get; init; }
    public bool IsFinished { get; init; }
    public WinnerMovieResponse? WinnerMovie { get; init; }

    /// <summary>Participant lié au compte connecté pour cette soirée, si applicable.</summary>
    public ParticipantResponse? MyParticipant { get; init; }

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    /// <summary>Liste des participants (pseudo, id), triés par ordre d'arrivée.</summary>
    public IReadOnlyList<EventParticipantSummaryResponse> Participants { get; init; } =
        Array.Empty<EventParticipantSummaryResponse>();
}

public sealed class EventParticipantSummaryResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;

    /// <summary>Vrai si ce participant est lié au créateur de la soirée (compte) — non retirable.</summary>
    public bool IsCreator { get; init; }
}

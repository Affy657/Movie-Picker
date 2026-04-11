namespace MoviePicker.Api.Domain.Entities;

public sealed record Participant
{
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;

    /// <summary>Lien optionnel vers un compte utilisateur (V1). Absent pour les invités « pseudo seul ».</summary>
    public string? UserId { get; init; }

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

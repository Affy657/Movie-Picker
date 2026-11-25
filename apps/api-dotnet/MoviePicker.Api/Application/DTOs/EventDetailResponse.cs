using System.Text.Json.Serialization;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventDetailResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? RecapSlug { get; init; }
    public required EventConfigResponse Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public IReadOnlyList<EventWinnerResponse> Winners { get; init; } =
        Array.Empty<EventWinnerResponse>();
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsHost { get; init; }
    public bool IsFinished { get; init; }
    public string Lifecycle { get; init; } = string.Empty;


    public ParticipantResponse? MyParticipant { get; init; }

    public bool ViewerRemoved { get; init; }

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    public int VotersCount { get; init; }

    public IReadOnlyList<EventParticipantSummaryResponse> Participants { get; init; } =
        Array.Empty<EventParticipantSummaryResponse>();

    public IReadOnlyList<RemovedPersonResponse> RemovedPeople { get; init; } =
        Array.Empty<RemovedPersonResponse>();
}

public sealed class EventWinnerResponse
{
    public string MovieId { get; init; } = string.Empty;
    public string PickMethod { get; init; } = string.Empty;
    public DateTimeOffset PickedAt { get; init; }
}

public sealed class EventParticipantSummaryResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;
    public bool IsCreator { get; init; }
    public bool IsCoHost { get; init; }
    public string AvatarId { get; init; } = string.Empty;

    public string? Handle { get; init; }
    public AccentColor? AccentColor { get; init; }
}

public sealed class RemovedPersonResponse
{
    public string Id { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public AccentColor AccentColor { get; init; }

    public static RemovedPersonResponse From(UserCard card)
    {
        var person = DisplayedPerson.From(card);
        return new RemovedPersonResponse
        {
            Id = person.UserId,
            DisplayName = person.DisplayName,
            AvatarId = person.AvatarId,
            Handle = person.PublicHandle,
            AccentColor = person.AccentColor
        };
    }
}

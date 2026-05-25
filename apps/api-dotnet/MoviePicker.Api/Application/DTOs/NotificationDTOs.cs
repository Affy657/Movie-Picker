using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record SubscribePushRequest
{
    [Required, Url, MaxLength(2048)]
    public string Endpoint { get; init; } = string.Empty;

    [Required, MaxLength(256)]
    public string P256dh { get; init; } = string.Empty;

    [Required, MaxLength(64)]
    public string Auth { get; init; } = string.Empty;
}

public sealed record UnsubscribePushRequest
{
    [Required, Url, MaxLength(2048)]
    public string Endpoint { get; init; } = string.Empty;
}

public sealed record NotificationPreferencesResponse
{
    public bool NotifyOnParticipantJoined { get; init; }
    public bool NotifyEventReminder { get; init; }
    public bool NotifyOnMovieAdded { get; init; }
    public bool NotifyOnMoviePicked { get; init; }
    public bool NotifyOnEventDeleted { get; init; }
}

public sealed record PatchNotificationPreferencesRequest
{
    public bool? NotifyOnParticipantJoined { get; init; }
    public bool? NotifyEventReminder { get; init; }
    public bool? NotifyOnMovieAdded { get; init; }
    public bool? NotifyOnMoviePicked { get; init; }
    public bool? NotifyOnEventDeleted { get; init; }
}

using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record InviteUserRequest
{
    [Required, MaxLength(64)]
    public string TargetUserId { get; init; } = string.Empty;
}

public sealed record InviteUserResponse
{
    public string Message { get; init; } = string.Empty;
}

public sealed record EligibleFollowItem
{
    public string UserId { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool IsAlreadyParticipant { get; init; }
    public bool IsAlreadyInvited { get; init; }
}

public sealed record EligibleFollowsResponse
{
    public IReadOnlyList<EligibleFollowItem> Follows { get; init; } = [];
}

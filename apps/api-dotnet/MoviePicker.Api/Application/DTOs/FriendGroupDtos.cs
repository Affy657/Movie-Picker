using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class CreateFriendGroupRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;
}

public sealed class UpdateFriendGroupRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;
}

public sealed class InviteToFriendGroupRequest
{
    [Required]
    [MaxLength(64)]
    public string UserId { get; init; } = string.Empty;
}

public sealed class FriendGroupPersonResponse
{
    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;

    public static FriendGroupPersonResponse From(DisplayedPerson person) => new()
    {
        UserId = person.UserId,
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId
    };
}

public sealed record FriendGroupNightsView(
    IReadOnlyList<MyEventSummaryDto> Upcoming,
    IReadOnlyList<MyEventSummaryDto> Past,
    IReadOnlyList<string> NextNightParticipantIds,
    FriendGroupStatsResponse Stats,
    FriendGroupCoverResponse? Cover)
{
    public static readonly FriendGroupNightsView None = new([], [], [], FriendGroupStatsResponse.None, null);
}

public sealed record FriendGroupListNights(
    IReadOnlyList<MyEventSummaryDto> NextNights,
    IReadOnlyList<FriendGroupShowcaseResponse> Showcases);

public sealed class FriendGroupStatsResponse
{
    public static readonly FriendGroupStatsResponse None = new();

    public int NightCount { get; init; }
    public int FilmCount { get; init; }
    public string? FirstNightDate { get; init; }
    public double? AverageRating { get; init; }
    public int? UsualWeekday { get; init; }
}

public sealed class FriendGroupCoverResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public string Title { get; init; } = string.Empty;
    public string BackdropUrl { get; init; } = string.Empty;
}

public sealed class FriendGroupShowcaseResponse
{
    public string GroupId { get; init; } = string.Empty;
    public int NightCount { get; init; }
    public FriendGroupCoverResponse? Cover { get; init; }
}

public sealed record FriendGroupAudience(
    FriendGroupRole Role,
    string OwnerDisplayName,
    IReadOnlyList<FriendGroupPersonResponse> MemberPreview);

public class FriendGroupSummaryResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public FriendGroupRole Role { get; init; }
    public string OwnerId { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public int MemberCount { get; init; }
    public IReadOnlyList<FriendGroupPersonResponse> MemberPreview { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public static FriendGroupSummaryResponse From(FriendGroup group, FriendGroupAudience audience) => new()
    {
        Id = group.Id,
        Name = group.Name,
        Role = audience.Role,
        OwnerId = group.OwnerId,
        OwnerDisplayName = audience.OwnerDisplayName,
        MemberCount = group.MemberCount,
        MemberPreview = audience.MemberPreview,
        CreatedAt = group.CreatedAt,
        UpdatedAt = group.UpdatedAt
    };
}

public sealed class FriendGroupMemberResponse
{
    public string UserId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public FriendGroupRole Role { get; init; }
    public DateTimeOffset JoinedAt { get; init; }

    public static FriendGroupMemberResponse From(DisplayedPerson person, FriendGroupRole role, DateTimeOffset joinedAt) => new()
    {
        UserId = person.UserId,
        Handle = person.PublicHandle,
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId,
        Role = role,
        JoinedAt = joinedAt
    };
}

public sealed class FriendGroupDetailResponse : FriendGroupSummaryResponse
{
    [JsonPropertyOrder(1)]
    public IReadOnlyList<FriendGroupMemberResponse> Members { get; init; } = [];

    [JsonPropertyOrder(2)]
    public IReadOnlyList<MyEventSummaryDto> UpcomingNights { get; init; } = [];

    [JsonPropertyOrder(3)]
    public IReadOnlyList<string> NextNightParticipantIds { get; init; } = [];

    [JsonPropertyOrder(4)]
    public IReadOnlyList<MyEventSummaryDto> PastNights { get; init; } = [];

    [JsonPropertyOrder(5)]
    public FriendGroupStatsResponse Stats { get; init; } = FriendGroupStatsResponse.None;

    [JsonPropertyOrder(6)]
    public FriendGroupCoverResponse? Cover { get; init; }

    public static FriendGroupDetailResponse From(
        FriendGroup group,
        FriendGroupAudience audience,
        IReadOnlyList<FriendGroupMemberResponse> members,
        FriendGroupNightsView nights) => new()
        {
            Id = group.Id,
            Name = group.Name,
            Role = audience.Role,
            OwnerId = group.OwnerId,
            OwnerDisplayName = audience.OwnerDisplayName,
            MemberCount = group.MemberCount,
            MemberPreview = audience.MemberPreview,
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            Members = members,
            UpcomingNights = nights.Upcoming,
            NextNightParticipantIds = nights.NextNightParticipantIds,
            PastNights = nights.Past,
            Stats = nights.Stats,
            Cover = nights.Cover
        };
}

public sealed class FriendGroupInvitationResponse
{
    public string GroupId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string InvitedByDisplayName { get; init; } = string.Empty;
    public int MemberCount { get; init; }
    public IReadOnlyList<FriendGroupPersonResponse> MemberPreview { get; init; } = [];
    public DateTimeOffset InvitedAt { get; init; }
}

public sealed class MyGroupsResponse
{
    public IReadOnlyList<FriendGroupSummaryResponse> Groups { get; init; } = [];
    public IReadOnlyList<FriendGroupInvitationResponse> Invitations { get; init; } = [];
    public IReadOnlyList<MyEventSummaryDto> NextNights { get; init; } = [];
    public IReadOnlyList<FriendGroupShowcaseResponse> Showcases { get; init; } = [];
}

public sealed class FriendGroupPendingInvitationResponse
{
    public string UserId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public DateTimeOffset InvitedAt { get; init; }

    public static FriendGroupPendingInvitationResponse From(DisplayedPerson person, DateTimeOffset invitedAt) => new()
    {
        UserId = person.UserId,
        Handle = person.PublicHandle,
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId,
        InvitedAt = invitedAt
    };
}

public sealed class FriendGroupInviteLinkResponse
{
    public string Token { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; init; }
    public bool Active { get; init; }

    public static FriendGroupInviteLinkResponse From(FriendGroupInviteLink link, DateTimeOffset now) => new()
    {
        Token = link.Token,
        ExpiresAt = link.ExpiresAt,
        Active = link.IsActive(now)
    };
}

public sealed class FriendGroupMembersResponse
{
    public int MaxMembers { get; init; } = FriendGroup.MaxMembers;
    public IReadOnlyList<FriendGroupMemberResponse> Members { get; init; } = [];
    public IReadOnlyList<FriendGroupPendingInvitationResponse>? Invitations { get; init; }
    public FriendGroupInviteLinkResponse? InviteLink { get; init; }
}

public sealed class FriendGroupInvitableUserResponse
{
    public string UserId { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;

    public static FriendGroupInvitableUserResponse From(DisplayedPerson person) => new()
    {
        UserId = person.UserId,
        Handle = person.Handle,
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId
    };
}

public sealed class FriendGroupInvitableUsersResponse
{
    public IReadOnlyList<FriendGroupInvitableUserResponse> Users { get; init; } = [];
}

public sealed class FriendGroupPreviewPersonResponse
{
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;

    public static FriendGroupPreviewPersonResponse From(DisplayedPerson person) => new()
    {
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId
    };
}

public sealed class FriendGroupInvitePreviewResponse
{
    public string Name { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
    public int MemberCount { get; init; }
    public IReadOnlyList<FriendGroupPreviewPersonResponse> MemberPreview { get; init; } = [];
    public bool IsFull { get; init; }
    public FriendGroupRole? Role { get; init; }
    public string? GroupId { get; init; }
}

public sealed class FriendGroupJoinResponse
{
    public FriendGroupSummaryResponse Group { get; init; } = new();
    public bool Joined { get; init; }
}

public sealed class FriendGroupRankingResponse
{
    public int NightCount { get; init; }
    public IReadOnlyList<FriendGroupMemberStatsResponse> Members { get; init; } = [];
}

public sealed class FriendGroupMemberStatsResponse
{
    public string UserId { get; init; } = string.Empty;
    public int ProposedCount { get; init; }
    public int WinningCount { get; init; }
    public int RatedWinningCount { get; init; }
    public double? ProposalsAverageRating { get; init; }
    public int UpVotesReceived { get; init; }
    public int UpVotesCast { get; init; }
    public int UpVotesOnWinner { get; init; }
    public int FreshProposalCount { get; init; }
    public int NightsAttended { get; init; }
    public int NightsSinceJoined { get; init; }
    public int NightsHosted { get; init; }
    public int RatingsGiven { get; init; }
    public double? AverageRatingGiven { get; init; }
}

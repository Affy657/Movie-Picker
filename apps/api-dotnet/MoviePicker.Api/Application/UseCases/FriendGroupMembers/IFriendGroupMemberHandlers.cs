using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public interface IGetFriendGroupMembersHandler
{
    Task<FriendGroupMembersResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IListFriendGroupInvitableUsersHandler
{
    Task<FriendGroupInvitableUsersResponse> HandleAsync(
        string userId,
        string groupId,
        string? query,
        CancellationToken ct = default);
}

public interface IInviteToFriendGroupHandler
{
    Task<FriendGroupPendingInvitationResponse> HandleAsync(
        string userId,
        string groupId,
        InviteToFriendGroupRequest request,
        CancellationToken ct = default);
}

public interface ICancelFriendGroupInvitationHandler
{
    Task HandleAsync(string userId, string groupId, string inviteeId, CancellationToken ct = default);
}

public interface IAcceptFriendGroupInvitationHandler
{
    Task<FriendGroupSummaryResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IDeclineFriendGroupInvitationHandler
{
    Task HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IRemoveFriendGroupMemberHandler
{
    Task HandleAsync(string userId, string groupId, string memberId, CancellationToken ct = default);
}

public interface ILeaveFriendGroupHandler
{
    Task HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface ICreateFriendGroupInviteLinkHandler
{
    Task<FriendGroupInviteLinkResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IDisableFriendGroupInviteLinkHandler
{
    Task HandleAsync(string userId, string groupId, CancellationToken ct = default);
}

public interface IGetFriendGroupInvitePreviewHandler
{
    Task<FriendGroupInvitePreviewResponse> HandleAsync(string? viewerId, string token, CancellationToken ct = default);
}

public interface IJoinFriendGroupHandler
{
    Task<FriendGroupJoinResponse> HandleAsync(string userId, string token, CancellationToken ct = default);
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroupMembers;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/groups")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class FriendGroupsController : ControllerBase
{
    [HttpGet]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupReadPolicy)]
    [ProducesResponseType(typeof(MyGroupsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromServices] IListFriendGroupsHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, ct));
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(typeof(FriendGroupSummaryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateFriendGroupRequest request,
        [FromServices] ICreateFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Created(string.Empty, await handler.HandleAsync(userId, request, ct));
    }

    [HttpGet("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupReadPolicy)]
    [ProducesResponseType(typeof(FriendGroupDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        string id,
        [FromServices] IGetFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpPatch("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(typeof(FriendGroupSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateFriendGroupRequest request,
        [FromServices] IUpdateFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, request, ct));
    }

    [HttpDelete("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        string id,
        [FromServices] IDeleteFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpGet("{id}/members")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupReadPolicy)]
    [ProducesResponseType(typeof(FriendGroupMembersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Members(
        string id,
        [FromServices] IGetFriendGroupMembersHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpGet("{id}/invitable")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupReadPolicy)]
    [ProducesResponseType(typeof(FriendGroupInvitableUsersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Invitable(
        string id,
        [FromQuery] string? query,
        [FromServices] IListFriendGroupInvitableUsersHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, query, ct));
    }

    [HttpPost("{id}/invitations")]
    [EnableRateLimiting(RateLimitingExtensions.InviteUserPolicy)]
    [ProducesResponseType(typeof(FriendGroupPendingInvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Invite(
        string id,
        [FromBody] InviteToFriendGroupRequest request,
        [FromServices] IInviteToFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Created(string.Empty, await handler.HandleAsync(userId, id, request, ct));
    }

    [HttpDelete("{id}/invitations/{userId}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelInvitation(
        string id,
        string userId,
        [FromServices] ICancelFriendGroupInvitationHandler handler,
        [CurrentUserId] string ownerId,
        CancellationToken ct)
    {
        await handler.HandleAsync(ownerId, id, userId, ct);
        return NoContent();
    }

    [HttpPost("{id}/invitation/accept")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(typeof(FriendGroupSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcceptInvitation(
        string id,
        [FromServices] IAcceptFriendGroupInvitationHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpPost("{id}/invitation/decline")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeclineInvitation(
        string id,
        [FromServices] IDeclineFriendGroupInvitationHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpDelete("{id}/members/{userId}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMember(
        string id,
        string userId,
        [FromServices] IRemoveFriendGroupMemberHandler handler,
        [CurrentUserId] string ownerId,
        CancellationToken ct)
    {
        await handler.HandleAsync(ownerId, id, userId, ct);
        return NoContent();
    }

    [HttpPost("{id}/leave")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Leave(
        string id,
        [FromServices] ILeaveFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpPost("{id}/invite-link")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(typeof(FriendGroupInviteLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateInviteLink(
        string id,
        [FromServices] ICreateFriendGroupInviteLinkHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpDelete("{id}/invite-link")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisableInviteLink(
        string id,
        [FromServices] IDisableFriendGroupInviteLinkHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpGet("join/{token}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupJoinPolicy)]
    [ProducesResponseType(typeof(FriendGroupInvitePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> InvitePreview(
        string token,
        [FromServices] IGetFriendGroupInvitePreviewHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var viewerId = currentUser.GetUserId();
        return Ok(await handler.HandleAsync(string.IsNullOrEmpty(viewerId) ? null : viewerId, token, ct));
    }

    [HttpPost("join/{token}")]
    [EnableRateLimiting(RateLimitingExtensions.FriendGroupJoinPolicy)]
    [ProducesResponseType(typeof(FriendGroupJoinResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(FriendGroupJoinResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Join(
        string token,
        [FromServices] IJoinFriendGroupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        var join = await handler.HandleAsync(userId, token, ct);
        return join.Joined ? Created(string.Empty, join) : Ok(join);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieListMembers;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/lists")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class MovieListsController : ControllerBase
{
    [HttpGet]
    [EnableRateLimiting(RateLimitingExtensions.MovieListReadPolicy)]
    [ProducesResponseType(typeof(MovieListsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int? tmdbId,
        [FromServices] IListMovieListsHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] MovieMediaType mediaType = MovieMediaType.Movie)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var probe = tmdbId is { } probedId ? new MovieListTitle(probedId, mediaType) : null;
        return Ok(await handler.HandleAsync(userId, probe, ct));
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListSummaryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMovieListRequest request,
        [FromServices] ICreateMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Created(string.Empty, await handler.HandleAsync(userId, request, ct));
    }

    [HttpGet("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListReadPolicy)]
    [ProducesResponseType(typeof(MovieListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        string id,
        [FromServices] IGetMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpPatch("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateMovieListRequest request,
        [FromServices] IUpdateMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, request, ct));
    }

    [HttpDelete("{id}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        string id,
        [FromServices] IDeleteMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpPost("{id}/items")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MovieListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddItem(
        string id,
        [FromBody] AddWatchlistItemRequest request,
        [FromServices] IAddMovieListItemHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var addition = await handler.HandleAsync(userId, id, request, ct);
        return addition.Created ? Created(string.Empty, addition.Item) : Ok(addition.Item);
    }

    [HttpDelete("{id}/items/{tmdbId:int}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveItem(
        string id,
        int tmdbId,
        [FromServices] IRemoveMovieListItemHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct,
        [FromQuery] MovieMediaType mediaType = MovieMediaType.Movie)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, new MovieListTitle(tmdbId, mediaType), ct);
        return NoContent();
    }

    [HttpGet("{id}/members")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListReadPolicy)]
    [ProducesResponseType(typeof(MovieListMembersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Members(
        string id,
        [FromServices] IGetMovieListMembersHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpGet("{id}/invitable")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListReadPolicy)]
    [ProducesResponseType(typeof(MovieListInvitableUsersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Invitable(
        string id,
        [FromQuery] string? q,
        [FromServices] IListMovieListInvitableUsersHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, q, ct));
    }

    [HttpPost("{id}/invitations")]
    [EnableRateLimiting(RateLimitingExtensions.InviteUserPolicy)]
    [ProducesResponseType(typeof(MovieListPendingInvitationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Invite(
        string id,
        [FromBody] InviteToMovieListRequest request,
        [FromServices] IInviteToMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Created(string.Empty, await handler.HandleAsync(userId, id, request, ct));
    }

    [HttpDelete("{id}/invitations/{userId}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelInvitation(
        string id,
        string userId,
        [FromServices] ICancelMovieListInvitationHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var ownerId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(ownerId))
            return Unauthorized();

        await handler.HandleAsync(ownerId, id, userId, ct);
        return NoContent();
    }

    [HttpPost("{id}/invitation/accept")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcceptInvitation(
        string id,
        [FromServices] IAcceptMovieListInvitationHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpPost("{id}/invitation/decline")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeclineInvitation(
        string id,
        [FromServices] IDeclineMovieListInvitationHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpDelete("{id}/members/{userId}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMember(
        string id,
        string userId,
        [FromServices] IRemoveMovieListMemberHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var ownerId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(ownerId))
            return Unauthorized();

        await handler.HandleAsync(ownerId, id, userId, ct);
        return NoContent();
    }

    [HttpPost("{id}/leave")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Leave(
        string id,
        [FromServices] ILeaveMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpPost("{id}/invite-link")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(typeof(MovieListInviteLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateInviteLink(
        string id,
        [FromServices] ICreateMovieListInviteLinkHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, id, ct));
    }

    [HttpDelete("{id}/invite-link")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisableInviteLink(
        string id,
        [FromServices] IDisableMovieListInviteLinkHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, id, ct);
        return NoContent();
    }

    [HttpGet("join/{token}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.MovieListJoinPolicy)]
    [ProducesResponseType(typeof(MovieListInvitePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> InvitePreview(
        string token,
        [FromServices] IGetMovieListInvitePreviewHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var viewerId = currentUser.GetUserId();
        return Ok(await handler.HandleAsync(string.IsNullOrEmpty(viewerId) ? null : viewerId, token, ct));
    }

    [HttpPost("join/{token}")]
    [EnableRateLimiting(RateLimitingExtensions.MovieListJoinPolicy)]
    [ProducesResponseType(typeof(MovieListSummaryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MovieListSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Join(
        string token,
        [FromServices] IJoinMovieListHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var join = await handler.HandleAsync(userId, token, ct);
        return join.Joined ? Created(string.Empty, join.List) : Ok(join.List);
    }
}

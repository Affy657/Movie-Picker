using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventTemplates;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Application.UseCases.UserStats;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/users")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class UsersController : ControllerBase
{
    [HttpGet("handle-available")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(HandleAvailabilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> HandleAvailable(
        [FromQuery] string? handle,
        [FromServices] ICheckHandleAvailabilityHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(handle ?? string.Empty, currentUserId, ct);
        return Ok(result);
    }

    [HttpGet("search")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.SearchUsersPolicy)]
    [ProducesResponseType(typeof(FollowListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromServices] ISearchUsersHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(q, currentUserId, ct);
        return Ok(result);
    }

    [HttpGet("{handle}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(PublicProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetPublicProfile(
        string handle,
        [FromServices] IGetPublicProfileHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var profile = await handler.HandleAsync(handle, currentUserId, ct);
        return Ok(profile);
    }

    [HttpGet("{handle}/stats")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(UserStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetUserStats(
        string handle,
        [FromServices] IGetUserStatsHandler handler,
        CancellationToken ct)
    {
        var stats = await handler.HandleAsync(handle, ct);
        return Ok(stats);
    }

    [HttpGet("{handle}/movies")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(UserMoviesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetUserMovies(
        string handle,
        [FromQuery] int skip,
        [FromQuery] int take,
        [FromServices] IGetUserMoviesHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(handle, skip, take, ct);
        return Ok(result);
    }

    [HttpGet("{handle}/watched-movies")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(UserWatchedMoviesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetUserWatchedMovies(
        string handle,
        [FromQuery] int take,
        [FromServices] IGetUserWatchedMoviesHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(handle, take, ct);
        return Ok(result);
    }

    [HttpGet("me/watched-movies")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(UserWatchedMoviesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetMyWatchedMovies(
        [FromQuery] int take,
        [FromServices] IGetUserWatchedMoviesHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleForUserAsync(userId, take, ct);
        return Ok(result);
    }

    [HttpGet("me/following-watched-movies")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(UserWatchedMoviesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetFollowingWatchedMovies(
        [FromQuery] int take,
        [FromServices] IGetFollowedWatchedMoviesHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await handler.HandleAsync(userId, take, ct);
        return Ok(result);
    }

    [HttpGet("me/event-templates")]
    [Authorize]
    [ProducesResponseType(typeof(EventTemplateListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListEventTemplates(
        [FromServices] IListEventTemplatesHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, ct));
    }

    [HttpPost("me/event-templates")]
    [Authorize]
    [ProducesResponseType(typeof(EventTemplateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateEventTemplate(
        [FromBody] SaveEventTemplateRequest request,
        [FromServices] ICreateEventTemplateHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Created(string.Empty, await handler.HandleAsync(userId, request, ct));
    }

    [HttpPut("me/event-templates/{templateId}")]
    [Authorize]
    [ProducesResponseType(typeof(EventTemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateEventTemplate(
        string templateId,
        [FromBody] SaveEventTemplateRequest request,
        [FromServices] IUpdateEventTemplateHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await handler.HandleAsync(userId, templateId, request, ct));
    }

    [HttpDelete("me/event-templates/{templateId}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEventTemplate(
        string templateId,
        [FromServices] IDeleteEventTemplateHandler handler,
        [FromServices] ICurrentUserAccessor currentUser,
        CancellationToken ct)
    {
        var userId = currentUser.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, templateId, ct);
        return NoContent();
    }

    [HttpPost("{handle}/follow")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.FollowMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Follow(
        string handle,
        [FromServices] IFollowUserHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId))
            return Unauthorized();

        await handler.HandleAsync(currentUserId, handle, ct);
        return NoContent();
    }

    [HttpDelete("{handle}/follow")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.FollowMutationPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Unfollow(
        string handle,
        [FromServices] IUnfollowUserHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId))
            return Unauthorized();

        await handler.HandleAsync(currentUserId, handle, ct);
        return NoContent();
    }

    [HttpGet("{handle}/following")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(FollowListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetFollowing(
        string handle,
        [FromServices] IGetFollowingListHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(handle, currentUserId, ct);
        return Ok(result);
    }

    [HttpGet("{handle}/followers")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.PublicProfilePolicy)]
    [ProducesResponseType(typeof(FollowListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> GetFollowers(
        string handle,
        [FromServices] IGetFollowersListHandler handler,
        CancellationToken ct)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await handler.HandleAsync(handle, currentUserId, ct);
        return Ok(result);
    }
}

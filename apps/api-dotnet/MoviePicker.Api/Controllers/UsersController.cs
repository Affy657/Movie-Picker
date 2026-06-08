using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Application.UseCases.Profile;
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

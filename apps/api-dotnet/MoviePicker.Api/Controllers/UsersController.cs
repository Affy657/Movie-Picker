using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Profile;
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
        var profile = await handler.HandleAsync(handle, ct);
        return Ok(profile);
    }
}

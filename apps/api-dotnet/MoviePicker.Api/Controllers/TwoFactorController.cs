using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Authorize]
[Route(ApiRoutePrefix.V1 + "/auth/me/two-factor")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class TwoFactorController : ControllerBase
{
    [HttpPost("setup")]
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(typeof(TwoFactorSetupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartSetup(
        [FromServices] IStartTwoFactorSetupHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(userId, ct));

    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(typeof(TwoFactorBackupCodesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Enable(
        [FromBody] EnableTwoFactorRequest request,
        [FromServices] IEnableTwoFactorHandler handler,
        [FromServices] TimeProvider clock,
        [CurrentUserId] string userId,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(userId, request, RecentAuthentication.IsRecent(User, clock.GetUtcNow()), ct));

    [HttpDelete]
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Disable(
        [FromBody] TwoFactorCodeRequest request,
        [FromServices] IDisableTwoFactorHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct)
    {
        await handler.HandleAsync(userId, request, ct);
        return NoContent();
    }

    [HttpPost("backup-codes")]
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(typeof(TwoFactorBackupCodesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegenerateBackupCodes(
        [FromBody] TwoFactorCodeRequest request,
        [FromServices] IRegenerateBackupCodesHandler handler,
        [CurrentUserId] string userId,
        CancellationToken ct) =>
        Ok(await handler.HandleAsync(userId, request, ct));
}

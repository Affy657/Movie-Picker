using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/auth")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class AuthController : ControllerBase
{
    private static ClaimsPrincipal CreatePrincipal(string userId, string displayName)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, displayName)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    private static AuthenticationProperties AuthProps() =>
        new()
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(14),
            AllowRefresh = true
        };

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitingExtensions.AuthRegisterPolicy)]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        [FromServices] IRegisterUserHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(request, ct);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            CreatePrincipal(result.UserId, result.DisplayName),
            AuthProps());
        return CreatedAtAction(nameof(Me), null, result);
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitingExtensions.AuthLoginPolicy)]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] ILoginUserHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(request, ct);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            CreatePrincipal(result.UserId, result.DisplayName),
            AuthProps());
        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Me([FromServices] IGetUserProfileHandler handler, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();
        var profile = await handler.HandleAsync(userId, ct);
        return Ok(profile);
    }

    [HttpPatch("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PatchMe(
        [FromBody] PatchUserProfileRequest? request,
        [FromServices] IPatchUserProfileHandler handler,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "Corps JSON requis."));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();
        var profile = await handler.HandleAsync(userId, request, ct);
        return Ok(profile);
    }

    [HttpPatch("me/password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest? request,
        [FromServices] IChangePasswordHandler handler,
        CancellationToken ct)
    {
        if (request is null)
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "Corps JSON requis."));

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request, ct);
        return NoContent();
    }

    [HttpPost("password-reset/request")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RequestPasswordReset(
        [FromBody] PasswordResetRequest request,
        [FromServices] IRequestPasswordResetHandler handler,
        CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();
        if (string.IsNullOrWhiteSpace(userAgent)) userAgent = null;
        await handler.HandleAsync(request, clientIp, userAgent, ct);
        return Accepted(); // 202 — toujours, même si l'email est inconnu (anti-énumération)
    }

    [HttpPost("password-reset/confirm")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPasswordResetConfirmPolicy)]
    [ProducesResponseType(typeof(PasswordResetConfirmResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ConfirmPasswordReset(
        [FromBody] PasswordResetConfirmRequest request,
        [FromServices] IConfirmPasswordResetHandler handler,
        CancellationToken ct)
    {
        var response = await handler.HandleAsync(request, ct);
        return Ok(response);
    }
}

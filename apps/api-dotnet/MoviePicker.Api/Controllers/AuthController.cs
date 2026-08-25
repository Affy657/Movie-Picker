using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Auth.OAuth;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Configuration;
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
            ExpiresUtc = DateTimeOffset.UtcNow.Add(AuthConstants.SessionLifetime),
            AllowRefresh = true
        };

    private static readonly JsonSerializerOptions DataExportJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
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

    private const string FrontLoginPath = "/login";
    private const string FrontAccountPath = "/settings";
    private const string FrontCallbackPath = "/auth/callback";
    private const string ReturnToItemKey = "returnTo";
    private const string OauthErrorQueryKey = "oauthError";

    [HttpGet("oauth/providers")]
    [ProducesResponseType(typeof(OAuthProvidersResponse), StatusCodes.Status200OK)]
    public IActionResult ListOAuthProviders([FromServices] OAuthProviderCatalog catalog) =>
        Ok(new OAuthProvidersResponse { Providers = catalog.Enabled });

    [HttpGet("oauth/{provider}/start")]
    [EnableRateLimiting(RateLimitingExtensions.AuthLoginPolicy)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult OAuthStart(
        string provider,
        [FromQuery] string? returnTo,
        [FromServices] OAuthProviderCatalog catalog)
    {
        if (!OAuthProviders.IsKnown(provider) || !catalog.IsEnabled(provider))
            return NotFound();

        var props = new AuthenticationProperties
        {
            RedirectUri = $"/{ApiRoutePrefix.V1}/auth/oauth/{provider}/callback"
        };
        props.Items[ReturnToItemKey] = ReturnToPolicy.Sanitize(returnTo);
        return Challenge(props, provider);
    }

    [HttpGet("oauth/{provider}/callback")]
    [EnableRateLimiting(RateLimitingExtensions.AuthLoginPolicy)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> OAuthCallback(
        string provider,
        [FromServices] IOAuthLoginHandler loginHandler,
        [FromServices] IOAuthLinkHandler linkHandler,
        [FromServices] OAuthProviderCatalog catalog,
        [FromServices] IOptions<MoviePickerOptions> options,
        CancellationToken ct)
    {
        var webBase = options.Value.ResolvedWebBaseUrl();

        if (!OAuthProviders.IsKnown(provider) || !catalog.IsEnabled(provider))
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "provider_disabled")));

        var externalResult = await HttpContext.AuthenticateAsync(AuthConstants.ExternalCookieScheme);
        await HttpContext.SignOutAsync(AuthConstants.ExternalCookieScheme);

        if (!externalResult.Succeeded || externalResult.Principal is null)
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "external_auth_failed")));

        var returnTo = ReturnToPolicy.Sanitize(
            externalResult.Properties?.Items.TryGetValue(ReturnToItemKey, out var storedReturnTo) == true
                ? storedReturnTo
                : null);

        var info = ExtractExternalLoginInfo(provider, externalResult.Principal);
        if (info is null)
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "provider_error"), (ReturnToItemKey, returnTo)));

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(currentUserId))
        {
            var linkOutcome = await linkHandler.HandleAsync(currentUserId, info, ct);
            return linkOutcome.Kind == OAuthOutcomeKind.Linked
                ? Redirect(BuildFrontUrl(webBase, FrontAccountPath, ("oauthLinked", provider)))
                : Redirect(BuildFrontUrl(webBase, FrontAccountPath, (OauthErrorQueryKey, "identity_taken")));
        }

        var loginOutcome = await loginHandler.HandleAsync(info, ct);
        if (loginOutcome.Kind != OAuthOutcomeKind.SignedIn || loginOutcome.User is null)
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "email_not_verified"), (ReturnToItemKey, returnTo)));

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            CreatePrincipal(loginOutcome.User.Id, loginOutcome.User.DisplayName),
            AuthProps());

        return Redirect(BuildFrontUrl(
            webBase,
            FrontCallbackPath,
            (ReturnToItemKey, returnTo),
            ("provider", provider),
            ("event", loginOutcome.IsNewAccount ? "signup" : "login")));
    }

    [HttpDelete("me/identities/{provider}")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthPatchProfilePolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnlinkIdentity(
        string provider,
        [FromServices] IOAuthUnlinkHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();
        await handler.HandleAsync(userId, provider, ct);
        return NoContent();
    }

    private static string BuildFrontUrl(string baseUrl, string path, params (string Key, string? Value)[] queryParams)
    {
        var query = string.Join(
            '&',
            queryParams
                .Where(p => !string.IsNullOrEmpty(p.Value))
                .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value!)}"));
        return string.IsNullOrEmpty(query) ? $"{baseUrl}{path}" : $"{baseUrl}{path}?{query}";
    }

    private static ExternalLoginInfo? ExtractExternalLoginInfo(string provider, ClaimsPrincipal principal)
    {
        var subject = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(subject))
            return null;

        var emailVerified = string.Equals(
            principal.FindFirstValue("email_verified"), "true", StringComparison.OrdinalIgnoreCase);

        return new ExternalLoginInfo
        {
            Provider = provider,
            Subject = subject,
            Email = principal.FindFirstValue(ClaimTypes.Email),
            EmailVerified = emailVerified,
            DisplayName = principal.FindFirstValue(ClaimTypes.Name) ?? string.Empty
        };
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
    [EnableRateLimiting(RateLimitingExtensions.AuthPatchProfilePolicy)]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
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
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
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

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        return NoContent();
    }

    [HttpGet("me/export")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthExportDataPolicy)]
    [ProducesResponseType(typeof(UserDataExportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ExportMyData(
        [FromServices] IExportUserDataHandler handler,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var export = await handler.HandleAsync(userId, ct);
        var json = JsonSerializer.Serialize(export, DataExportJsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var fileName = string.Create(
            CultureInfo.InvariantCulture,
            $"movie-picker-mes-donnees-{export.ExportedAt:yyyy-MM-dd}.json");
        Response.Headers.CacheControl = "no-store";
        return File(bytes, "application/json", fileName);
    }

    [HttpDelete("me")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthDeleteAccountPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> DeleteMe(
        [FromBody] DeleteAccountRequest? request,
        [FromServices] IDeleteAccountHandler handler,
        CancellationToken ct)
    {
        if (request is null)
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "Corps JSON requis."));

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request, ct);

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

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
        return Accepted();
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

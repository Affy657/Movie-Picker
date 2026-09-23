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
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route(ApiRoutePrefix.V1 + "/auth")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class AuthController : ControllerBase
{
    private static ClaimsPrincipal CreatePrincipal(string userId, string displayName, DateTimeOffset authenticatedAt)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, displayName),
            RecentAuthentication.ClaimFor(authenticatedAt)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    private static AuthenticationProperties AuthProps(DateTimeOffset now) =>
        new()
        {
            IsPersistent = true,
            ExpiresUtc = now.Add(AuthConstants.SessionLifetime),
            AllowRefresh = true
        };

    private Task SignInAsync(string userId, string displayName, TimeProvider clock)
    {
        var now = clock.GetUtcNow();
        return HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            CreatePrincipal(userId, displayName, now),
            AuthProps(now));
    }

    private bool IsRecentlyAuthenticated(TimeProvider clock) =>
        RecentAuthentication.IsRecent(User, clock.GetUtcNow());

    private static readonly JsonSerializerOptions DataExportJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitingExtensions.AuthRegisterPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthRegisterPolicy)]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        [FromServices] IRegisterUserHandler handler,
        [FromServices] TimeProvider clock,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(request, ct);
        await SignInAsync(result.UserId, result.DisplayName, clock);
        return CreatedAtAction(nameof(Me), null, result);
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitingExtensions.AuthLoginPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthLoginPolicy)]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] ILoginUserHandler handler,
        [FromServices] TimeProvider clock,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(request, ct);
        await SignInAsync(result.UserId, result.DisplayName, clock);
        return Ok(result);
    }

    [HttpPost("logout")]
    [EnableRateLimiting(RateLimitingExtensions.AuthLogoutPolicy)]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private const string FrontLoginPath = "/login";
    private const string FrontIntegrationsPath = "/settings/integrations";
    private const string FrontCallbackPath = "/auth/callback";
    private const string ReturnToItemKey = "returnTo";
    private const string OauthErrorQueryKey = "oauthError";
    private const string ReauthenticationRequiredError = "reauthentication_required";

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
        [FromServices] OAuthProviderCatalog catalog,
        [FromServices] IOptions<MoviePickerOptions> options,
        [FromServices] TimeProvider clock)
    {
        if (!OAuthProviders.TryResolve(provider, out var knownProvider) || !catalog.IsEnabled(knownProvider))
            return NotFound();

        if (User.Identity?.IsAuthenticated == true && !IsRecentlyAuthenticated(clock))
            return Redirect(BuildFrontUrl(options.Value.ResolvedWebBaseUrl(), FrontIntegrationsPath, (OauthErrorQueryKey, ReauthenticationRequiredError)));

        var props = new AuthenticationProperties
        {
            RedirectUri = $"/{ApiRoutePrefix.V1}/auth/oauth/{knownProvider}/callback"
        };
        props.Items[ReturnToItemKey] = ReturnToPolicy.Sanitize(returnTo);
        return Challenge(props, knownProvider);
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
        [FromServices] TimeProvider clock,
        CancellationToken ct)
    {
        var webBase = options.Value.ResolvedWebBaseUrl();

        if (!OAuthProviders.TryResolve(provider, out var knownProvider) || !catalog.IsEnabled(knownProvider))
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "provider_disabled")));

        var externalResult = await HttpContext.AuthenticateAsync(AuthConstants.ExternalCookieScheme);
        await HttpContext.SignOutAsync(AuthConstants.ExternalCookieScheme);

        if (!externalResult.Succeeded || externalResult.Principal is null)
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "external_auth_failed")));

        var returnTo = ReturnToPolicy.Sanitize(
            externalResult.Properties?.Items.TryGetValue(ReturnToItemKey, out var storedReturnTo) == true
                ? storedReturnTo
                : null);

        var info = ExtractExternalLoginInfo(knownProvider, externalResult.Principal);
        if (info is null)
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, "provider_error"), (ReturnToItemKey, returnTo)));

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(currentUserId))
        {
            if (!IsRecentlyAuthenticated(clock))
                return Redirect(BuildFrontUrl(webBase, FrontIntegrationsPath, (OauthErrorQueryKey, ReauthenticationRequiredError)));

            var linkOutcome = await linkHandler.HandleAsync(currentUserId, info, ct);
            return linkOutcome.Kind switch
            {
                OAuthOutcomeKind.Linked => Redirect(BuildFrontUrl(webBase, FrontIntegrationsPath, ("oauthLinked", knownProvider))),
                OAuthOutcomeKind.ProviderAlreadyLinked => Redirect(BuildFrontUrl(webBase, FrontIntegrationsPath, (OauthErrorQueryKey, "provider_already_linked"))),
                _ => Redirect(BuildFrontUrl(webBase, FrontIntegrationsPath, (OauthErrorQueryKey, "identity_taken")))
            };
        }

        var loginOutcome = await loginHandler.HandleAsync(info, ct);
        if (loginOutcome.Kind != OAuthOutcomeKind.SignedIn || loginOutcome.User is null)
        {
            var errorCode = loginOutcome.Kind == OAuthOutcomeKind.PasswordAccountRequiresManualLink
                ? "account_exists"
                : "email_not_verified";
            return Redirect(BuildFrontUrl(webBase, FrontLoginPath, (OauthErrorQueryKey, errorCode), (ReturnToItemKey, returnTo)));
        }

        await SignInAsync(loginOutcome.User.Id, loginOutcome.User.DisplayName, clock);

        return Redirect(BuildFrontUrl(
            webBase,
            FrontCallbackPath,
            (ReturnToItemKey, returnTo),
            ("provider", knownProvider),
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
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();
        if (!OAuthProviders.TryResolve(provider, out var knownProvider))
            return NotFound();
        await handler.HandleAsync(userId, knownProvider, ct);
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
        if (!User.TryGetUserId(out var userId))
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
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "JSON body required", ErrorCodes.ValidationFailed));
        }

        if (!User.TryGetUserId(out var userId))
            return Unauthorized();
        var profile = await handler.HandleAsync(userId, request, ct);
        return Ok(profile);
    }

    [HttpPatch("me/password")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthChangePasswordPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest? request,
        [FromServices] IChangePasswordHandler handler,
        [FromServices] TimeProvider clock,
        CancellationToken ct)
    {
        if (request is null)
            return BadRequest(
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "JSON body required", ErrorCodes.ValidationFailed));

        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request, IsRecentlyAuthenticated(clock), ct);

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        return NoContent();
    }

    [HttpGet("me/export")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.AuthExportDataPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthExportDataPolicy)]
    [ProducesResponseType(typeof(UserDataExportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ExportMyData(
        [FromServices] IExportUserDataHandler handler,
        CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
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
    [SharedRateLimit(RateLimitingExtensions.AuthDeleteAccountPolicy)]
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
                ApiErrorResponse.FromHttpContext(HttpContext, StatusCodes.Status400BadRequest, "JSON body required", ErrorCodes.ValidationFailed));

        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        await handler.HandleAsync(userId, request, ct);

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        return NoContent();
    }

    [HttpPost("password-reset/request")]
    [EnableRateLimiting(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
    [SharedRateLimit(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
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
    [SharedRateLimit(RateLimitingExtensions.AuthPasswordResetConfirmPolicy)]
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

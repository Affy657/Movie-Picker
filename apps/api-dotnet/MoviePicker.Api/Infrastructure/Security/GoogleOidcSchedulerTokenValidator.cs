using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class GoogleOidcSchedulerTokenValidator : IGoogleOidcSchedulerTokenValidator
{
    public const string GoogleIssuer = "https://accounts.google.com";
    public const string GoogleDiscoveryDocument = GoogleIssuer + "/.well-known/openid-configuration";
    private static readonly string[] AcceptedIssuers = [GoogleIssuer, "accounts.google.com"];
    private static readonly TimeSpan ClockSkew = TimeSpan.FromMinutes(1);

    private readonly JsonWebTokenHandler _handler = new();
    private readonly IConfigurationManager<OpenIdConnectConfiguration> _googleConfiguration;
    private readonly ILogger<GoogleOidcSchedulerTokenValidator> _logger;
    private readonly string? _audience;
    private readonly string? _serviceAccount;

    public GoogleOidcSchedulerTokenValidator(
        IOptions<MoviePickerOptions> options,
        IConfigurationManager<OpenIdConnectConfiguration> googleConfiguration,
        ILogger<GoogleOidcSchedulerTokenValidator> logger)
    {
        _googleConfiguration = googleConfiguration;
        _logger = logger;
        _audience = options.Value.SchedulerOidcAudience;
        _serviceAccount = options.Value.SchedulerOidcServiceAccount;
    }

    public bool IsConfigured => _audience is not null && _serviceAccount is not null;

    public async Task<bool> IsValidAsync(string? bearerToken, CancellationToken ct)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(bearerToken))
            return false;

        var result = await ValidateAsync(bearerToken.Trim(), ct);
        if (result.Exception is SecurityTokenSignatureKeyNotFoundException)
        {
            _googleConfiguration.RequestRefresh();
            result = await ValidateAsync(bearerToken.Trim(), ct);
        }

        if (!result.IsValid)
        {
            _logger.LogWarning("Scheduler OIDC token refused: {Reason}", result.Exception?.GetType().Name ?? "invalid");
            return false;
        }

        return EmailIsVerified(result.Claims) && EmailMatches(result.Claims);
    }

    private async Task<TokenValidationResult> ValidateAsync(string token, CancellationToken ct)
    {
        var configuration = await _googleConfiguration.GetConfigurationAsync(ct);
        var parameters = new TokenValidationParameters
        {
            ValidIssuers = AcceptedIssuers,
            ValidAudience = _audience,
            IssuerSigningKeys = configuration.SigningKeys,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ClockSkew = ClockSkew
        };
        return await _handler.ValidateTokenAsync(token, parameters);
    }

    private bool EmailMatches(IDictionary<string, object> claims) =>
        claims.TryGetValue("email", out var email)
        && string.Equals(email?.ToString(), _serviceAccount, StringComparison.OrdinalIgnoreCase);

    private static bool EmailIsVerified(IDictionary<string, object> claims) =>
        claims.TryGetValue("email_verified", out var verified)
        && (verified is true || string.Equals(verified?.ToString(), "true", StringComparison.OrdinalIgnoreCase));
}

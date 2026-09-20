using System.Security.Cryptography;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Security;

public sealed class GoogleOidcSchedulerTokenValidatorTests
{
    private const string Audience = "https://api.movie-picker.test";
    private const string ServiceAccount = "movie-picker-scheduler@project.iam.gserviceaccount.com";

    private static readonly RsaSecurityKey GoogleKey = new(RSA.Create(2048)) { KeyId = "google-key" };
    private static readonly RsaSecurityKey ForeignKey = new(RSA.Create(2048)) { KeyId = "foreign-key" };

    private static GoogleOidcSchedulerTokenValidator Build(
        string? audience = Audience,
        string? serviceAccount = ServiceAccount,
        SecurityKey? knownKey = null)
    {
        var configuration = new OpenIdConnectConfiguration { Issuer = GoogleOidcSchedulerTokenValidator.GoogleIssuer };
        configuration.SigningKeys.Add(knownKey ?? GoogleKey);
        return new GoogleOidcSchedulerTokenValidator(
            Options.Create(new MoviePickerOptions
            {
                SchedulerOidcAudience = audience,
                SchedulerOidcServiceAccount = serviceAccount
            }),
            new StaticConfigurationManager<OpenIdConnectConfiguration>(configuration),
            NullLogger<GoogleOidcSchedulerTokenValidator>.Instance);
    }

    private static string Token(
        string issuer = GoogleOidcSchedulerTokenValidator.GoogleIssuer,
        string audience = Audience,
        string? email = ServiceAccount,
        object? emailVerified = null,
        SecurityKey? signingKey = null,
        TimeSpan? lifetime = null)
    {
        var claims = new Dictionary<string, object>();
        if (email is not null) claims["email"] = email;
        claims["email_verified"] = emailVerified ?? true;
        var now = DateTime.UtcNow;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            IssuedAt = now.AddMinutes(-1),
            NotBefore = now.AddMinutes(-1),
            Expires = now.Add(lifetime ?? TimeSpan.FromMinutes(5)),
            Claims = claims,
            SigningCredentials = new SigningCredentials(signingKey ?? GoogleKey, SecurityAlgorithms.RsaSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    [Fact]
    public void IsConfigured_RequiresBothTheAudienceAndTheServiceAccount()
    {
        Assert.True(Build().IsConfigured);
        Assert.False(Build(audience: null).IsConfigured);
        Assert.False(Build(serviceAccount: null).IsConfigured);
    }

    [Fact]
    public async Task IsValidAsync_TokenSignedByGoogleForTheAudienceAndTheAccount_IsTrue()
    {
        Assert.True(await Build().IsValidAsync(Token(), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_AcceptsTheBareIssuerGoogleAlsoUses()
    {
        Assert.True(await Build().IsValidAsync(Token(issuer: "accounts.google.com"), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_WithoutConfiguration_IsFalseEvenForAGoodToken()
    {
        Assert.False(await Build(audience: null).IsValidAsync(Token(), CancellationToken.None));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-jwt")]
    public async Task IsValidAsync_MissingOrUnreadableToken_IsFalse(string? presented)
    {
        Assert.False(await Build().IsValidAsync(presented, CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_TokenForAnotherAudience_IsFalse()
    {
        Assert.False(await Build().IsValidAsync(Token(audience: "https://other.example"), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_TokenFromAnotherIssuer_IsFalse()
    {
        Assert.False(await Build().IsValidAsync(Token(issuer: "https://issuer.example"), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_TokenSignedByAnUnknownKey_IsFalse()
    {
        Assert.False(await Build().IsValidAsync(Token(signingKey: ForeignKey), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_ExpiredToken_IsFalse()
    {
        var expired = Token(lifetime: TimeSpan.FromMinutes(-10));

        Assert.False(await Build().IsValidAsync(expired, CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_TokenOfAnotherServiceAccount_IsFalse()
    {
        var other = Token(email: "someone-else@project.iam.gserviceaccount.com");

        Assert.False(await Build().IsValidAsync(other, CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_TokenWithoutEmail_IsFalse()
    {
        Assert.False(await Build().IsValidAsync(Token(email: null), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_UnverifiedEmail_IsFalse()
    {
        Assert.False(await Build().IsValidAsync(Token(emailVerified: false), CancellationToken.None));
    }

    [Fact]
    public async Task IsValidAsync_ComparesTheAccountCaseInsensitively()
    {
        var upper = Token(email: ServiceAccount.ToUpperInvariant());

        Assert.True(await Build().IsValidAsync(upper, CancellationToken.None));
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class TwoFactorEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Password = "abcd1234";

    private static readonly JsonSerializerOptions JsonReadOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public TwoFactorEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private sealed record Account(HttpClient Client, string Email, IReadOnlyList<string> BackupCodes);

    private async Task<Account> RegisterWithTwoFactorAsync()
    {
        var client = _factory.CreateClient();
        var email = $"u{Guid.NewGuid():N}@test.local";
        var register = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = Password, DisplayName = "Double" });
        register.EnsureSuccessStatusCode();

        var setupResponse = await client.PostAsync("/api/v1/auth/me/two-factor/setup", null);
        Assert.Equal(HttpStatusCode.OK, setupResponse.StatusCode);
        var setup = (await setupResponse.Content.ReadFromJsonAsync<TwoFactorSetupResponse>(JsonReadOptions))!;
        Assert.StartsWith("otpauth://totp/", setup.OtpauthUri, StringComparison.Ordinal);

        var code = Totp.CodeAt(Base32.Decode(setup.ManualKey)!, Totp.StepAt(DateTimeOffset.UtcNow));
        var enable = await client.PostAsJsonAsync(
            "/api/v1/auth/me/two-factor",
            new EnableTwoFactorRequest { SetupToken = setup.SetupToken, Code = code, CurrentPassword = Password });
        Assert.Equal(HttpStatusCode.OK, enable.StatusCode);
        var codes = (await enable.Content.ReadFromJsonAsync<TwoFactorBackupCodesResponse>(JsonReadOptions))!;
        return new Account(client, email, codes.BackupCodes);
    }

    private static async Task<UserProfileResponse> ProfileAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", JsonReadOptions))!;

    private static async Task<HttpResponseMessage> LogInAgainAsync(Account account)
    {
        var logout = await account.Client.PostAsync("/api/v1/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        return await account.Client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = account.Email, Password = Password });
    }

    private static async Task<string?> ErrorCodeOf(HttpResponseMessage response)
    {
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.TryGetProperty("reason", out var reason) ? reason.GetString() : null;
    }

    [Fact]
    public async Task Enable_ShowsUpOnTheProfileWithTenBackupCodes()
    {
        var account = await RegisterWithTwoFactorAsync();

        var profile = await ProfileAsync(account.Client);

        Assert.True(profile.TwoFactorEnabled);
        Assert.Equal(BackupCodes.Count, profile.BackupCodesRemaining);
        Assert.Equal(BackupCodes.Count, account.BackupCodes.Count);
    }

    [Fact]
    public async Task Login_WithTwoFactor_AsksForTheCodeWithoutOpeningASession()
    {
        var account = await RegisterWithTwoFactorAsync();

        var login = await LogInAgainAsync(account);

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = (await login.Content.ReadFromJsonAsync<LoginResponse>(JsonReadOptions))!;
        Assert.True(body.TwoFactorRequired);
        Assert.Equal(string.Empty, body.UserId);
        Assert.DoesNotContain(
            login.Headers.GetValues("Set-Cookie"),
            header => header.StartsWith(AuthConstants.CookieName + "=", StringComparison.Ordinal));
        Assert.Contains(
            login.Headers.GetValues("Set-Cookie"),
            header => header.StartsWith(AuthConstants.TwoFactorChallengeCookieName + "=", StringComparison.Ordinal)
                && header.Contains("httponly", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.Unauthorized, (await account.Client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Verify_WithABackupCode_OpensTheSessionAndSpendsTheCode()
    {
        var account = await RegisterWithTwoFactorAsync();
        await LogInAgainAsync(account);

        var verify = await account.Client.PostAsJsonAsync(
            "/api/v1/auth/two-factor/verify",
            new TwoFactorCodeRequest { Code = account.BackupCodes[0] });

        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        var body = (await verify.Content.ReadFromJsonAsync<TwoFactorLoginResponse>(JsonReadOptions))!;
        Assert.True(body.UsedBackupCode);
        Assert.Equal(BackupCodes.Count - 1, body.BackupCodesRemaining);
        Assert.Equal(BackupCodes.Count - 1, (await ProfileAsync(account.Client)).BackupCodesRemaining);
    }

    [Fact]
    public async Task Verify_WrongCode_StaysSignedOutWithAReadableError()
    {
        var account = await RegisterWithTwoFactorAsync();
        await LogInAgainAsync(account);

        var verify = await account.Client.PostAsJsonAsync(
            "/api/v1/auth/two-factor/verify",
            new TwoFactorCodeRequest { Code = "000000" });

        Assert.Equal(HttpStatusCode.BadRequest, verify.StatusCode);
        Assert.Equal(ErrorCodes.TwoFactorCodeInvalid, await ErrorCodeOf(verify));
        Assert.Equal(HttpStatusCode.Unauthorized, (await account.Client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Verify_WithoutAPendingSignIn_IsRefused()
    {
        var client = _factory.CreateClient();

        var verify = await client.PostAsJsonAsync(
            "/api/v1/auth/two-factor/verify",
            new TwoFactorCodeRequest { Code = "123456" });

        Assert.Equal(HttpStatusCode.BadRequest, verify.StatusCode);
        Assert.Equal(ErrorCodes.TwoFactorChallengeExpired, await ErrorCodeOf(verify));
    }

    [Fact]
    public async Task Disable_WithABackupCode_LetsThePasswordAloneSignInAgain()
    {
        var account = await RegisterWithTwoFactorAsync();

        var disable = await account.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me/two-factor")
        {
            Content = JsonContent.Create(new TwoFactorCodeRequest { Code = account.BackupCodes[1] })
        });

        Assert.Equal(HttpStatusCode.NoContent, disable.StatusCode);
        Assert.False((await ProfileAsync(account.Client)).TwoFactorEnabled);
        var login = await LogInAgainAsync(account);
        var body = (await login.Content.ReadFromJsonAsync<LoginResponse>(JsonReadOptions))!;
        Assert.False(body.TwoFactorRequired);
        Assert.Equal(HttpStatusCode.OK, (await account.Client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task RegenerateBackupCodes_ReplacesTheOldOnes()
    {
        var account = await RegisterWithTwoFactorAsync();

        var regenerate = await account.Client.PostAsJsonAsync(
            "/api/v1/auth/me/two-factor/backup-codes",
            new TwoFactorCodeRequest { Code = account.BackupCodes[2] });

        Assert.Equal(HttpStatusCode.OK, regenerate.StatusCode);
        var fresh = (await regenerate.Content.ReadFromJsonAsync<TwoFactorBackupCodesResponse>(JsonReadOptions))!;
        Assert.Equal(BackupCodes.Count, fresh.BackupCodes.Count);
        Assert.Empty(fresh.BackupCodes.Intersect(account.BackupCodes));
    }
}

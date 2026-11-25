using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed partial class EmailVerificationEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonRead = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EmailVerificationEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _factory.FakeEmail.Clear();
    }

    private static void KeepSessionCookie(HttpClient client, HttpResponseMessage response)
    {
        var session = response.Headers.GetValues("Set-Cookie")
            .First(header => header.StartsWith(AuthConstants.CookieName + "=", StringComparison.OrdinalIgnoreCase));
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", session.Split(';')[0].Trim());
    }

    private async Task<(HttpClient Client, string Email)> RegisterAsync(string locale = "fr")
    {
        var client = _factory.CreateClient();
        var email = $"confirm{Guid.NewGuid():N}@test.local";
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "Confirm", Locale = locale });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        KeepSessionCookie(client, response);
        return (client, email);
    }

    private EmailMessage[] ConfirmationEmailsTo(string email) =>
        _factory.FakeEmail.SentMessages
            .Where(m => m.Tag == EmailVerificationEmailFactory.Tag && m.ToEmail == email)
            .ToArray();

    private static string TokenOf(EmailMessage message)
    {
        var match = ConfirmationLinkRegex().Match(message.HtmlBody);
        Assert.True(match.Success, "confirmation link missing from the HTML body");
        return match.Groups[1].Value;
    }

    private static async Task<DateTimeOffset?> ConfirmedAtAsync(HttpClient client)
    {
        var me = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", JsonRead);
        return me!.EmailVerifiedAt;
    }

    [Fact]
    public async Task Register_SendsAConfirmationLinkInTheAskedLanguage_AndTheAccountWorksUnconfirmed()
    {
        var (client, email) = await RegisterAsync("en");

        var sent = Assert.Single(ConfirmationEmailsTo(email));
        Assert.Contains("https://web.integration.test/verify-email?token=", sent.HtmlBody);
        Assert.StartsWith("Confirm", sent.Subject);
        Assert.Null(await ConfirmedAtAsync(client));
    }

    [Fact]
    public async Task Confirm_FromTheLinkWithoutASession_ConfirmsTheAddressOfTheAccount()
    {
        var (client, email) = await RegisterAsync();
        var token = TokenOf(ConfirmationEmailsTo(email).Single());

        var confirm = await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/email-verification/confirm",
            new EmailVerificationConfirmRequest { Token = token });

        Assert.Equal(HttpStatusCode.NoContent, confirm.StatusCode);
        Assert.NotNull(await ConfirmedAtAsync(client));
    }

    [Fact]
    public async Task Confirm_UnknownToken_IsRefusedWithItsOwnReason()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/email-verification/confirm",
            new EmailVerificationConfirmRequest { Token = "not-a-real-token" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(ErrorCodes.InvalidEmailVerificationToken, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Resend_WithinAMinuteOfTheFirstEmail_IsAcceptedWithoutSendingASecond()
    {
        var (client, email) = await RegisterAsync();

        var resend = await client.PostAsJsonAsync("/api/v1/auth/me/email-verification", new EmailVerificationRequest { Locale = "fr" });

        Assert.Equal(HttpStatusCode.Accepted, resend.StatusCode);
        Assert.Single(ConfirmationEmailsTo(email));
    }

    [Fact]
    public async Task Resend_WithoutASession_IsRefused()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/v1/auth/me/email-verification", new EmailVerificationRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Resend_AfterConfirmation_SendsNothingMore()
    {
        var (client, email) = await RegisterAsync();
        await client.PostAsJsonAsync("/api/v1/auth/email-verification/confirm",
            new EmailVerificationConfirmRequest { Token = TokenOf(ConfirmationEmailsTo(email).Single()) });
        _factory.FakeEmail.Clear();

        var resend = await client.PostAsJsonAsync("/api/v1/auth/me/email-verification", new EmailVerificationRequest());

        Assert.Equal(HttpStatusCode.Accepted, resend.StatusCode);
        Assert.Empty(ConfirmationEmailsTo(email));
    }

    [GeneratedRegex(@"https?://[^/\s]+/verify-email\?token=([A-Za-z0-9_-]+)")]
    private static partial Regex ConfirmationLinkRegex();
}

using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class GitHubOAuthEventsTests
{
    [Fact]
    public void FindVerifiedPrimaryEmail_ReturnsPrimaryVerified()
    {
        using var doc = JsonDocument.Parse(
            """
            [
              { "email": "other@ex.com", "primary": false, "verified": true },
              { "email": "main@ex.com", "primary": true, "verified": true }
            ]
            """);

        Assert.Equal("main@ex.com", GitHubOAuthEvents.FindVerifiedPrimaryEmail(doc.RootElement));
    }

    [Fact]
    public void FindVerifiedPrimaryEmail_IgnoresUnverifiedPrimary()
    {
        using var doc = JsonDocument.Parse(
            """
            [{ "email": "main@ex.com", "primary": true, "verified": false }]
            """);

        Assert.Null(GitHubOAuthEvents.FindVerifiedPrimaryEmail(doc.RootElement));
    }

    [Fact]
    public void FindVerifiedPrimaryEmail_IgnoresNonArray()
    {
        using var doc = JsonDocument.Parse("""{ "email": "x@ex.com" }""");

        Assert.Null(GitHubOAuthEvents.FindVerifiedPrimaryEmail(doc.RootElement));
    }

    [Fact]
    public void FindVerifiedPrimaryEmail_MissingEmailProperty_ReturnsNull()
    {
        using var doc = JsonDocument.Parse(
            """
            [{ "primary": true, "verified": true }]
            """);

        Assert.Null(GitHubOAuthEvents.FindVerifiedPrimaryEmail(doc.RootElement));
    }

    [Fact]
    public async Task OnCreatingTicketAsync_AddsVerifiedPrimaryEmailClaim()
    {
        var handler = new ScriptedHandler(
            [
                (HttpStatusCode.OK, """{"login":"octocat"}"""),
                (
                    HttpStatusCode.OK,
                    """[{ "email": "octo@ex.com", "primary": true, "verified": true }]"""
                )
            ]);
        using var httpClient = new HttpClient(handler);
        var context = CreateTicketContext(httpClient);

        await GitHubOAuthEvents.OnCreatingTicketAsync(context);

        Assert.Equal("octo@ex.com", context.Identity!.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Equal("true", context.Identity.FindFirst("email_verified")?.Value);
    }

    [Fact]
    public async Task OnCreatingTicketAsync_SkipsEmail_WhenEmailsEndpointFails()
    {
        var handler = new ScriptedHandler(
            [
                (HttpStatusCode.OK, """{"login":"octocat"}"""),
                (HttpStatusCode.Forbidden, "nope")
            ]);
        using var httpClient = new HttpClient(handler);
        var context = CreateTicketContext(httpClient);

        await GitHubOAuthEvents.OnCreatingTicketAsync(context);

        Assert.Null(context.Identity!.FindFirst(ClaimTypes.Email));
    }

    private static OAuthCreatingTicketContext CreateTicketContext(HttpClient backchannel)
    {
        var options = new OAuthOptions
        {
            ClientId = "id",
            ClientSecret = "secret",
            CallbackPath = "/signin-github",
            UserInformationEndpoint = "https://api.github.com/user",
            Backchannel = backchannel
        };
        var tokenDoc = JsonDocument.Parse("""{"access_token":"tok"}""");
        var userDoc = JsonDocument.Parse("{}");
        var tokens = OAuthTokenResponse.Success(tokenDoc);
        var identity = new ClaimsIdentity("GitHub");
        return new OAuthCreatingTicketContext(
            new ClaimsPrincipal(identity),
            new AuthenticationProperties(),
            new DefaultHttpContext(),
            new AuthenticationScheme("GitHub", "GitHub", typeof(OAuthHandler<OAuthOptions>)),
            options,
            backchannel,
            tokens,
            userDoc.RootElement);
    }

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Queue<(HttpStatusCode Status, string Body)> _responses;

        public ScriptedHandler(IReadOnlyList<(HttpStatusCode Status, string Body)> responses) =>
            _responses = new Queue<(HttpStatusCode, string)>(responses);

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var (status, body) = _responses.Dequeue();
            return Task.FromResult(
                new HttpResponseMessage(status)
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json")
                });
        }
    }
}

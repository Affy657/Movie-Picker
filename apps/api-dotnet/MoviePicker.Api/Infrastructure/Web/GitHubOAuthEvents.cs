using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.OAuth;

namespace MoviePicker.Api.Infrastructure.Web;

public static class GitHubOAuthEvents
{
    private const string EmailsEndpoint = "https://api.github.com/user/emails";

    public static async Task OnCreatingTicketAsync(OAuthCreatingTicketContext context)
    {
        using var userRequest = BuildRequest(context.Options.UserInformationEndpoint, context.AccessToken!);
        using var userResponse = await context.Backchannel.SendAsync(
            userRequest, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);
        userResponse.EnsureSuccessStatusCode();
        using var userPayload = JsonDocument.Parse(
            await userResponse.Content.ReadAsStringAsync(context.HttpContext.RequestAborted));
        context.RunClaimActions(userPayload.RootElement);

        var verifiedPrimaryEmail = await FetchVerifiedPrimaryEmailAsync(context);
        if (verifiedPrimaryEmail is not null)
        {
            context.Identity!.AddClaim(new Claim(ClaimTypes.Email, verifiedPrimaryEmail));
            context.Identity.AddClaim(new Claim("email_verified", "true"));
        }
    }

    private static async Task<string?> FetchVerifiedPrimaryEmailAsync(OAuthCreatingTicketContext context)
    {
        using var request = BuildRequest(EmailsEndpoint, context.AccessToken!);
        using var response = await context.Backchannel.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);
        if (!response.IsSuccessStatusCode)
            return null;

        using var payload = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(context.HttpContext.RequestAborted));
        return FindVerifiedPrimaryEmail(payload.RootElement);
    }

    internal static string? FindVerifiedPrimaryEmail(JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var entry in payload.EnumerateArray())
        {
            var isPrimary = entry.TryGetProperty("primary", out var primaryProp) && primaryProp.GetBoolean();
            var isVerified = entry.TryGetProperty("verified", out var verifiedProp) && verifiedProp.GetBoolean();
            if (isPrimary && isVerified && entry.TryGetProperty("email", out var emailProp))
                return emailProp.GetString();
        }

        return null;
    }

    private static HttpRequestMessage BuildRequest(string uri, string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.UserAgent.ParseAdd("MoviePicker-Api/1.0");
        return request;
    }
}

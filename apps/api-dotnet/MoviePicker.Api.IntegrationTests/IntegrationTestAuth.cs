using System.Net.Http.Json;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.IntegrationTests;

internal static class IntegrationTestAuth
{
    public static void ApplySessionCookie(HttpClient client, HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var headers))
            return;
        foreach (var header in headers)
        {
            var prefix = AuthConstants.CookieName + "=";
            if (header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var pair = header.Split(';')[0].Trim();
                client.DefaultRequestHeaders.Remove("Cookie");
                client.DefaultRequestHeaders.Add("Cookie", pair);
                return;
            }
        }
    }

    public static async Task<HttpClient> NewRegisteredClientAsync(
        MoviePickerApplicationFactory factory,
        string displayName = "Tester")
    {
        var client = factory.CreateClient();
        var email = $"u{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = displayName });
        reg.EnsureSuccessStatusCode();
        ApplySessionCookie(client, reg);
        return client;
    }
}

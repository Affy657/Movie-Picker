using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class UserSearchEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public UserSearchEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, UserProfileResponse Profile)> NewUserAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        Assert.NotNull(profile);
        return (client, profile!);
    }

    private static async Task<FollowListResponse> SearchAsync(HttpClient client, string query)
    {
        var result = await client.GetFromJsonAsync<FollowListResponse>(
            $"/api/v1/users/search?q={Uri.EscapeDataString(query)}", Json);
        Assert.NotNull(result);
        return result!;
    }

    [Fact]
    public async Task Search_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v1/users/search?q=zoltan");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Search_FindsUserByDisplayNameSubstring()
    {
        var marker = $"Zeph{Guid.NewGuid():N}"[..14];
        var (_, target) = await NewUserAsync($"Nadia {marker}");
        var (searcher, _) = await NewUserAsync("SearchSeeker");

        var result = await SearchAsync(searcher, marker[4..]);

        Assert.Contains(result.Items, i => i.Handle == target.Handle);
    }

    [Fact]
    public async Task Search_IgnoresCaseAndDiacritics()
    {
        var marker = $"Zeph{Guid.NewGuid():N}"[..14];
        var (_, target) = await NewUserAsync($"Léandre {marker}");
        var (searcher, _) = await NewUserAsync("DiacriticSeeker");

        var result = await SearchAsync(searcher, $"leandre {marker}".ToUpperInvariant());

        Assert.Contains(result.Items, i => i.Handle == target.Handle);
    }

    [Fact]
    public async Task Search_ExcludesPrivateProfiles()
    {
        var marker = $"Zeph{Guid.NewGuid():N}"[..14];
        var (hidden, target) = await NewUserAsync($"Discret {marker}");
        var patch = await hidden.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        patch.EnsureSuccessStatusCode();
        var (searcher, _) = await NewUserAsync("PrivacySeeker");

        var result = await SearchAsync(searcher, marker[4..]);

        Assert.DoesNotContain(result.Items, i => i.Handle == target.Handle);
    }

    [Fact]
    public async Task Search_ReportsWhetherEachResultIsAlreadyFollowed()
    {
        var marker = $"Zeph{Guid.NewGuid():N}"[..14];
        var (_, followed) = await NewUserAsync($"Suivi {marker}");
        var (_, stranger) = await NewUserAsync($"Inconnu {marker}");
        var (searcher, _) = await NewUserAsync("FollowStateSeeker");
        var follow = await searcher.PostAsync($"/api/v1/users/{followed.Handle}/follow", null);
        follow.EnsureSuccessStatusCode();

        var result = await SearchAsync(searcher, marker[4..]);

        Assert.True(result.Items.Single(i => i.Handle == followed.Handle).IsFollowedByMe);
        Assert.False(result.Items.Single(i => i.Handle == stranger.Handle).IsFollowedByMe);
    }

    [Fact]
    public async Task Search_QueryShorterThanTwoCharacters_ReturnsEmpty()
    {
        var (searcher, _) = await NewUserAsync("ShortQuerySeeker");

        var result = await SearchAsync(searcher, "a");

        Assert.Empty(result.Items);
    }
}

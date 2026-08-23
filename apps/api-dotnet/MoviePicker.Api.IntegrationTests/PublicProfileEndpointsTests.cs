using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class PublicProfileEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public PublicProfileEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<UserProfileResponse> GetMeAsync(HttpClient client)
    {
        var me = await client.GetAsync("/api/v1/auth/me");
        me.EnsureSuccessStatusCode();
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        return profile!;
    }

    [Fact]
    public async Task Register_AssignsHandle_AndPublicProfileIsReachableAnonymously()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Profil Public");
        var me = await GetMeAsync(client);
        Assert.False(string.IsNullOrWhiteSpace(me.Handle));

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var profile = await res.Content.ReadFromJsonAsync<PublicProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        Assert.Equal(me.Handle, profile!.Handle);
        Assert.Equal("Profil Public", profile.DisplayName);
    }

    [Fact]
    public async Task PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Discret");
        var me = await GetMeAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task UnknownHandle_Returns404()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/users/nobody_here_xyz");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Movies_PublicProfile_ReturnsEmptyListWithZeroTotal()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Sans Film");
        var me = await GetMeAsync(client);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/movies");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var movies = await res.Content.ReadFromJsonAsync<UserMoviesResponse>(JsonOptions);
        Assert.NotNull(movies);
        Assert.Empty(movies!.Items);
        Assert.Equal(0, movies.TotalCount);
    }

    [Fact]
    public async Task Movies_PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Films Discrets");
        var me = await GetMeAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/movies");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Movies_UnknownHandle_Returns404()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/users/nobody_here_xyz/movies");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task HandleAvailable_ReflectsExistingHandles()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Taken User");
        var me = await GetMeAsync(client);

        var anon = _factory.CreateClient();

        var taken = await anon.GetAsync($"/api/v1/users/handle-available?handle={me.Handle}");
        taken.EnsureSuccessStatusCode();
        var takenBody = await taken.Content.ReadFromJsonAsync<HandleAvailabilityResponse>(JsonOptions);
        Assert.NotNull(takenBody);
        Assert.False(takenBody!.Available);

        var free = await anon.GetAsync("/api/v1/users/handle-available?handle=totally_free_42");
        free.EnsureSuccessStatusCode();
        var freeBody = await free.Content.ReadFromJsonAsync<HandleAvailabilityResponse>(JsonOptions);
        Assert.NotNull(freeBody);
        Assert.True(freeBody!.Available);

        var invalid = await anon.GetAsync("/api/v1/users/handle-available?handle=ab");
        invalid.EnsureSuccessStatusCode();
        var invalidBody = await invalid.Content.ReadFromJsonAsync<HandleAvailabilityResponse>(JsonOptions);
        Assert.NotNull(invalidBody);
        Assert.False(invalidBody!.Available);
    }

    [Fact]
    public async Task PatchHandle_ChangesPublicProfileUrl()
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var handle = $"renamed_{unique}";
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Renamer");

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { handle });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{handle}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task PatchHandle_AlreadyTaken_Returns409()
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var contested = $"contested_{unique}";

        var first = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "First Owner");
        var firstPatch = await first.PatchAsJsonAsync("/api/v1/auth/me", new { handle = contested });
        Assert.Equal(HttpStatusCode.OK, firstPatch.StatusCode);

        var second = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Second Owner");
        var secondPatch = await second.PatchAsJsonAsync("/api/v1/auth/me", new { handle = contested });
        Assert.Equal(HttpStatusCode.Conflict, secondPatch.StatusCode);
    }
}

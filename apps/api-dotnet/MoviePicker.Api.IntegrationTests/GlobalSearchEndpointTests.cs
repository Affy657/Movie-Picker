using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class GlobalSearchEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public GlobalSearchEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<GlobalSearchResponse> SearchAsync(HttpClient client, string query)
    {
        var response = await client.GetAsync($"/api/v1/search?q={Uri.EscapeDataString(query)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<GlobalSearchResponse>(Json))!;
    }

    [Fact]
    public async Task Search_Anonymous_FindsTitlesButNeitherTheMatchingMemberNorTheirNight()
    {
        var marker = $"Qx{Guid.NewGuid():N}"[..12];
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, $"Hôte {marker}");
        var night = await host.PostAsJsonAsync("/api/v1/events", new { title = $"Soirée {marker}", date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, night.StatusCode);
        var signedIn = await SearchAsync(host, marker);
        Assert.NotEmpty(signedIn.Members);
        Assert.NotEmpty(signedIn.Nights);

        var result = await SearchAsync(_factory.CreateClient(), marker);

        Assert.Contains(result.Titles, title => title.Title == "Film E2E Stub");
        Assert.Empty(result.Members);
        Assert.Empty(result.Nights);
        Assert.Empty(result.Groups);
        Assert.Empty(result.Lists);
    }

    [Fact]
    public async Task Search_SignedIn_KeepsSomeoneElsesGroupAndPrivateListHidden()
    {
        var marker = $"Qw{Guid.NewGuid():N}"[..12];
        var owner = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Propriétaire secret");
        var searcher = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Curieux");
        Assert.Equal(HttpStatusCode.Created, (await owner.PostAsJsonAsync("/api/v1/groups", new { name = $"Groupe {marker}" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await owner.PostAsJsonAsync("/api/v1/lists", new { name = $"Liste {marker}" })).StatusCode);

        var result = await SearchAsync(searcher, marker);

        Assert.Empty(result.Groups);
        Assert.Empty(result.Lists);
        Assert.Empty(result.PublicLists);
    }

    [Fact]
    public async Task Search_SignedIn_FindsMembersAndOwnNightsButNotSomeoneElsesNight()
    {
        var marker = $"Qz{Guid.NewGuid():N}"[..12];
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, $"Hôte {marker}");
        var stranger = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Inconnu");
        var mine = await host.PostAsJsonAsync("/api/v1/events", new { title = $"Soirée {marker}", date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, mine.StatusCode);
        var theirs = await stranger.PostAsJsonAsync("/api/v1/events", new { title = $"Autre {marker}", date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, theirs.StatusCode);

        var result = await SearchAsync(host, marker);

        Assert.Equal([$"Soirée {marker}"], result.Nights.Select(night => night.Title));
        Assert.False(result.Nights[0].IsFinished);
        Assert.Equal(TestDates.Upcoming, result.Nights[0].Date);
        Assert.Contains(result.Members, member => member.DisplayName == $"Hôte {marker}");
    }

    [Fact]
    public async Task Search_SignedIn_FindsOwnGroupsAndListsAndOthersPublicLists()
    {
        var marker = $"Qy{Guid.NewGuid():N}"[..12];
        var owner = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Propriétaire");
        var other = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Autre membre");
        Assert.Equal(HttpStatusCode.Created, (await owner.PostAsJsonAsync("/api/v1/groups", new { name = $"Groupe {marker}" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await owner.PostAsJsonAsync("/api/v1/lists", new { name = $"Liste {marker}" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await other.PostAsJsonAsync("/api/v1/lists", new { name = $"Publique {marker}", isPublic = true })).StatusCode);

        var result = await SearchAsync(owner, marker);

        Assert.Equal([$"Groupe {marker}"], result.Groups.Select(group => group.Name));
        Assert.Equal([$"Liste {marker}"], result.Lists.Select(list => list.Name));
        var shared = Assert.Single(result.PublicLists);
        Assert.Equal($"Publique {marker}", shared.Name);
        Assert.Equal("Autre membre", shared.OwnerDisplayName);
        Assert.NotEmpty(shared.OwnerHandle);
    }

    [Fact]
    public async Task Search_TooShort_ReturnsEmptySections()
    {
        var result = await SearchAsync(_factory.CreateClient(), "f");

        Assert.Empty(result.Titles);
        Assert.Empty(result.Members);
        Assert.Empty(result.Nights);
    }
}

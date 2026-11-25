using System.Net;
using System.Net.Http.Json;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class IdeaSuggestionsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public IdeaSuggestionsEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _factory.FakeGitHubIssues.Clear();
    }

    private static object ValidBody(IdeaSuggestionCategory category = IdeaSuggestionCategory.Idea) => new
    {
        category,
        title = "Ajouter un mode battle",
        description = "Ce serait top d'avoir un mode tournoi.",
        pagePath = "/e/abc123",
        appVersion = "1.4.0"
    };

    [Fact]
    public async Task Create_Authenticated_CreatesGitHubIssue_AndReturns204()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "IdeaAuthor");

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", ValidBody());

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Contains(_factory.FakeGitHubIssues.CreatedIssues, i => i.Title.Contains("Ajouter un mode battle"));
    }

    [Fact]
    public async Task Create_FromAFrontThatStillSendsScreenshots_OpensTheIssueWithoutThem()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "IdeaOldFront");
        var body = new
        {
            category = IdeaSuggestionCategory.Bug,
            title = "Capture jointe par un ancien front",
            description = "Le bouton ne répond plus.",
            attachments = new[]
            {
                new { fileName = "a.png", contentType = "image/png", base64Content = "iVBORw0KGgo=" }
            }
        };

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", body);

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        var issue = Assert.Single(_factory.FakeGitHubIssues.CreatedIssues, i => i.Title.Contains("Capture jointe par un ancien front"));
        Assert.DoesNotContain("![", issue.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var anon = _factory.CreateClient();

        var res = await anon.PostAsJsonAsync("/api/v1/idea-suggestions", ValidBody());

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_MissingTitle_Returns400()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "IdeaBadRequest");

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", new
        {
            category = IdeaSuggestionCategory.Idea,
            title = "",
            description = "Description valide"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_MissingCategory_Returns400()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "IdeaNoCategory");

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", new
        {
            title = "Titre valide",
            description = "Description valide"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_GitHubUnavailable_Returns503()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "IdeaGitHubDown");
        _factory.FakeGitHubIssues.ShouldFail = true;

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", ValidBody());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }
}

using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.GitHub;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.GitHub;

public class GitHubIssueClientTests
{
    private static MoviePickerOptions OptionsWith(
        string? token = "ghp_test_token",
        string owner = "Affy657",
        string repo = "Movie-Picker")
        => new()
        {
            GitHubToken = token,
            GitHubRepoOwner = owner,
            GitHubRepoName = repo,
        };

    private static GitHubIssueDraft SampleDraft() =>
        new(
            "[Idée] Titre de test",
            "Corps du message\n\n---\nAuteur : Alice (@alice)",
            ["idée-utilisateur", "user-feedback"]);

    [Fact]
    public async Task CreateIssueAsync_HappyPath_PostsToIssuesEndpointWithBearerAndExpectedBody()
    {
        HttpRequestMessage? captured = null;
        string? capturedBody = null;
        var handler = new RecordingHandler(async (req, ct) =>
        {
            captured = req;
            capturedBody = await (req.Content?.ReadAsStringAsync(ct) ?? Task.FromResult(string.Empty));
            return new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = JsonContent.Create(new { number = 1 })
            };
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        await client.CreateIssueAsync(SampleDraft());

        Assert.NotNull(captured);
        Assert.Equal(HttpMethod.Post, captured!.Method);
        Assert.Equal("/repos/Affy657/Movie-Picker/issues", captured.RequestUri!.PathAndQuery);
        Assert.Equal("Bearer", captured.Headers.Authorization?.Scheme);
        Assert.Equal("ghp_test_token", captured.Headers.Authorization?.Parameter);

        Assert.NotNull(capturedBody);
        using var doc = JsonDocument.Parse(capturedBody!);
        var root = doc.RootElement;
        Assert.Equal("[Idée] Titre de test", root.GetProperty("title").GetString());
        Assert.Contains("Alice (@alice)", root.GetProperty("body").GetString());
        Assert.Equal("idée-utilisateur", root.GetProperty("labels")[0].GetString());
        Assert.Equal("user-feedback", root.GetProperty("labels")[1].GetString());
    }

    [Fact]
    public async Task CreateIssueAsync_MissingToken_ThrowsServiceUnavailable_WithoutCallingHttp()
    {
        var called = false;
        var handler = new RecordingHandler((_, _) =>
        {
            called = true;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith(token: null)), NullLogger<GitHubIssueClient>.Instance);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => client.CreateIssueAsync(SampleDraft()));
        Assert.False(called);
    }

    [Fact]
    public async Task CreateIssueAsync_NonSuccessStatus_ThrowsServiceUnavailable()
    {
        var handler = new RecordingHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("{\"message\":\"boom\"}")
        }));
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => client.CreateIssueAsync(SampleDraft()));
    }

    [Fact]
    public async Task CreateIssueAsync_UnprocessableLabels_RetriesWithoutLabelsAndSucceeds()
    {
        var bodies = new List<string>();
        var handler = new RecordingHandler(async (req, ct) =>
        {
            bodies.Add(await (req.Content?.ReadAsStringAsync(ct) ?? Task.FromResult(string.Empty)));
            if (bodies.Count == 1)
            {
                return new HttpResponseMessage(HttpStatusCode.UnprocessableEntity)
                {
                    Content = new StringContent("{\"message\":\"Validation Failed\"}")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = JsonContent.Create(new { number = 2 })
            };
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        await client.CreateIssueAsync(SampleDraft());

        Assert.Equal(2, bodies.Count);
        using (var first = JsonDocument.Parse(bodies[0]))
        {
            Assert.True(first.RootElement.TryGetProperty("labels", out _));
        }
        using (var second = JsonDocument.Parse(bodies[1]))
        {
            Assert.False(second.RootElement.TryGetProperty("labels", out _));
        }
    }

    [Fact]
    public async Task CreateIssueAsync_HttpRequestException_ThrowsServiceUnavailable()
    {
        var handler = new RecordingHandler((_, _) =>
            Task.FromException<HttpResponseMessage>(new HttpRequestException("connection refused")));
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => client.CreateIssueAsync(SampleDraft()));
    }

    [Fact]
    public async Task CreateIssueAsync_Timeout_ThrowsServiceUnavailable()
    {
        var handler = new RecordingHandler((_, _) =>
            Task.FromException<HttpResponseMessage>(new TaskCanceledException("timeout")));
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => client.CreateIssueAsync(SampleDraft()));
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _fn;
        public RecordingHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> fn) => _fn = fn;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => _fn(request, cancellationToken);
    }
}

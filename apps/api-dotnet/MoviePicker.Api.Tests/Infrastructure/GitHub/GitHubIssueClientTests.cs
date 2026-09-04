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

    [Fact]
    public async Task UploadAttachmentAsync_BranchAlreadyExists_PutsContentAndReturnsDownloadUrl()
    {
        var handler = new RoutingHandler(RouteBranchExists);
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        var url = await client.UploadAttachmentAsync(new GitHubAttachmentUpload("screenshot.png", "image/png", "QkFTRTY0"));

        Assert.Equal(
            "https://raw.githubusercontent.com/Affy657/Movie-Picker/feedback-attachments/x.png", url);
        Assert.DoesNotContain(handler.Calls, c => c.Method == HttpMethod.Post && c.Path.EndsWith("/git/refs"));
    }

    [Fact]
    public async Task UploadAttachmentAsync_BranchMissing_CreatesBranchThenUploads()
    {
        var handler = new RoutingHandler(RouteBranchMissing);
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        var url = await client.UploadAttachmentAsync(new GitHubAttachmentUpload("screenshot.png", "image/png", "QkFTRTY0"));

        Assert.Equal(
            "https://raw.githubusercontent.com/Affy657/Movie-Picker/feedback-attachments/x.png", url);
        Assert.Contains(handler.Calls, c => c.Method == HttpMethod.Post && c.Path.EndsWith("/git/refs"));
    }

    [Fact]
    public async Task UploadAttachmentAsync_SuccessResponseMissingDownloadUrl_ReturnsNull_DoesNotThrow()
    {
        var handler = new RoutingHandler(req =>
        {
            var path = req.RequestUri!.PathAndQuery;
            if (req.Method == HttpMethod.Get && path.EndsWith("/git/ref/heads/feedback-attachments"))
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
            if (req.Method == HttpMethod.Put && path.Contains("/contents/"))
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)
                {
                    Content = JsonContent.Create(new { commit = new { sha = "abc" } })
                });
            throw new InvalidOperationException($"Unexpected request {req.Method} {path}");
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        var url = await client.UploadAttachmentAsync(new GitHubAttachmentUpload("screenshot.png", "image/png", "QkFTRTY0"));

        Assert.Null(url);
    }

    [Fact]
    public async Task UploadAttachmentAsync_MissingToken_ReturnsNull_WithoutCallingHttp()
    {
        var called = false;
        var handler = new RoutingHandler(_ =>
        {
            called = true;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith(token: null)), NullLogger<GitHubIssueClient>.Instance);

        var url = await client.UploadAttachmentAsync(new GitHubAttachmentUpload("screenshot.png", "image/png", "QkFTRTY0"));

        Assert.Null(url);
        Assert.False(called);
    }

    [Fact]
    public async Task UploadAttachmentAsync_PutFails_ReturnsNull()
    {
        var handler = new RoutingHandler(req =>
        {
            var path = req.RequestUri!.PathAndQuery;
            if (req.Method == HttpMethod.Get && path.EndsWith("/git/ref/heads/feedback-attachments"))
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
            if (req.Method == HttpMethod.Put)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.UnprocessableEntity));
            throw new InvalidOperationException($"Unexpected request {req.Method} {path}");
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") };
        var client = new GitHubIssueClient(http, Options.Create(OptionsWith()), NullLogger<GitHubIssueClient>.Instance);

        var url = await client.UploadAttachmentAsync(new GitHubAttachmentUpload("screenshot.png", "image/png", "QkFTRTY0"));

        Assert.Null(url);
    }

    private static Task<HttpResponseMessage> RouteBranchExists(HttpRequestMessage req)
    {
        var path = req.RequestUri!.PathAndQuery;
        if (req.Method == HttpMethod.Get && path.EndsWith("/git/ref/heads/feedback-attachments"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        if (req.Method == HttpMethod.Put && path.Contains("/contents/"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = JsonContent.Create(new
                {
                    content = new
                    {
                        download_url = "https://raw.githubusercontent.com/Affy657/Movie-Picker/feedback-attachments/x.png"
                    }
                })
            });
        throw new InvalidOperationException($"Unexpected request {req.Method} {path}");
    }

    private static Task<HttpResponseMessage> RouteBranchMissing(HttpRequestMessage req)
    {
        var path = req.RequestUri!.PathAndQuery;
        if (req.Method == HttpMethod.Get && path.EndsWith("/git/ref/heads/feedback-attachments"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        if (req.Method == HttpMethod.Get && path == "/repos/Affy657/Movie-Picker")
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { default_branch = "master" })
            });
        if (req.Method == HttpMethod.Get && path.EndsWith("/git/ref/heads/master"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { @object = new { sha = "abc123" } })
            });
        if (req.Method == HttpMethod.Post && path.EndsWith("/git/refs"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created));
        if (req.Method == HttpMethod.Put && path.Contains("/contents/"))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = JsonContent.Create(new
                {
                    content = new
                    {
                        download_url = "https://raw.githubusercontent.com/Affy657/Movie-Picker/feedback-attachments/x.png"
                    }
                })
            });
        throw new InvalidOperationException($"Unexpected request {req.Method} {path}");
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _fn;
        public RecordingHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> fn) => _fn = fn;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => _fn(request, cancellationToken);
    }

    private sealed class RoutingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _fn;
        public List<(HttpMethod Method, string Path)> Calls { get; } = [];
        public RoutingHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> fn) => _fn = fn;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls.Add((request.Method, request.RequestUri!.PathAndQuery));
            return await _fn(request);
        }
    }
}

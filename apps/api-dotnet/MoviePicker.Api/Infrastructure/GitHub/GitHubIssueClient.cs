using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.GitHub;

public sealed class GitHubIssueClient : IGitHubIssueClient
{
    private const string BearerScheme = "Bearer";

    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<GitHubIssueClient> _logger;

    public GitHubIssueClient(HttpClient http, IOptions<MoviePickerOptions> options, ILogger<GitHubIssueClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task CreateIssueAsync(GitHubIssueDraft draft, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.GitHubToken))
        {
            _logger.LogWarning("GitHub issue creation skipped: GITHUB_TOKEN not configured");
            throw Errors.SuggestionUnavailable();
        }

        var res = await PostIssueAsync(draft.Title, draft.Body, draft.Labels, ct);
        if (res.StatusCode == HttpStatusCode.UnprocessableEntity && draft.Labels.Count > 0)
        {
            _logger.LogWarning(
                "GitHub issue creation returned 422 with labels, retrying without labels");
            res.Dispose();
            res = await PostIssueAsync(draft.Title, draft.Body, [], ct);
        }

        using (res)
        {
            if (!res.IsSuccessStatusCode)
            {
                string body;
                try { body = await res.Content.ReadAsStringAsync(ct); }
                catch { body = "<unreadable>"; }
                _logger.LogWarning(
                    "GitHub issue creation failed status={Status} body={Body}",
                    (int)res.StatusCode,
                    Truncate(body, 256));
                throw Errors.SuggestionUnavailable();
            }
        }
    }

    private async Task<HttpResponseMessage> PostIssueAsync(
        string title,
        string body,
        IReadOnlyList<string> labels,
        CancellationToken ct)
    {
        object payload = labels.Count > 0
            ? new { title, body, labels }
            : new { title, body };

        using var req = new HttpRequestMessage(
            HttpMethod.Post,
            $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/issues")
        {
            Content = JsonContent.Create(payload)
        };
        req.Headers.Authorization = new AuthenticationHeaderValue(BearerScheme, _options.GitHubToken);

        try
        {
            return await _http.SendAsync(req, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Network failure while creating the GitHub issue");
            throw Errors.SuggestionUnavailable();
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout while creating the GitHub issue");
            throw Errors.SuggestionUnavailable();
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

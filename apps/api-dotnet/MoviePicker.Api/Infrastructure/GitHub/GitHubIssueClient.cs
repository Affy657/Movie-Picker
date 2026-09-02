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
    private const string UnavailableMessage =
        "Impossible de créer la suggestion pour le moment. Réessayez dans un instant.";

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
            _logger.LogWarning("Création d'issue GitHub ignorée : GITHUB_TOKEN non configuré");
            throw new ServiceUnavailableException(UnavailableMessage);
        }

        var res = await PostIssueAsync(draft.Title, draft.Body, draft.Labels, ct);
        try
        {
            if (res.StatusCode == HttpStatusCode.UnprocessableEntity && draft.Labels.Count > 0)
            {
                _logger.LogWarning(
                    "Création d'issue GitHub 422 avec labels, nouvel essai sans labels");
                res.Dispose();
                res = await PostIssueAsync(draft.Title, draft.Body, [], ct);
            }

            if (!res.IsSuccessStatusCode)
            {
                string body;
                try { body = await res.Content.ReadAsStringAsync(ct); }
                catch { body = "<unreadable>"; }
                _logger.LogWarning(
                    "Création d'issue GitHub échouée status={Status} body={Body}",
                    (int)res.StatusCode,
                    Truncate(body, 256));
                throw new ServiceUnavailableException(UnavailableMessage);
            }
        }
        finally
        {
            res.Dispose();
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
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);

        try
        {
            return await _http.SendAsync(req, ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Échec réseau lors de la création de l'issue GitHub");
            throw new ServiceUnavailableException(UnavailableMessage);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout lors de la création de l'issue GitHub");
            throw new ServiceUnavailableException(UnavailableMessage);
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

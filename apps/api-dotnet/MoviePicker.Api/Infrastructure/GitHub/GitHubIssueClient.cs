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

        using var req = new HttpRequestMessage(
            HttpMethod.Post,
            $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/issues")
        {
            Content = JsonContent.Create(new
            {
                title = draft.Title,
                body = draft.Body,
                labels = draft.Labels
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);

        HttpResponseMessage res;
        try
        {
            res = await _http.SendAsync(req, ct);
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

        try
        {
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

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

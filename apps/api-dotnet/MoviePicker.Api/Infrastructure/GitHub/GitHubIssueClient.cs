using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

    private static readonly IReadOnlyDictionary<string, string> ExtensionByContentType =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/png"] = "png",
            ["image/jpeg"] = "jpg",
            ["image/webp"] = "webp",
            ["image/gif"] = "gif",
        };

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

    public async Task<string?> UploadAttachmentAsync(GitHubAttachmentUpload attachment, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.GitHubToken))
        {
            _logger.LogWarning("Upload de pièce jointe GitHub ignoré : GITHUB_TOKEN non configuré");
            return null;
        }

        try
        {
            var branch = _options.GitHubAttachmentsBranch;
            await EnsureAttachmentsBranchExistsAsync(branch, ct);

            var extension = ExtensionByContentType.GetValueOrDefault(attachment.ContentType, "bin");
            var path = $"feedback-attachments/{DateTime.UtcNow:yyyy-MM-dd}/{Guid.NewGuid():N}.{extension}";

            using var req = new HttpRequestMessage(
                HttpMethod.Put,
                $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/contents/{path}")
            {
                Content = JsonContent.Create(new
                {
                    message = "feedback: capture d'écran",
                    content = attachment.Base64Content,
                    branch
                })
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);

            using var res = await _http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Upload de pièce jointe GitHub échoué status={Status} file={FileName}",
                    (int)res.StatusCode,
                    attachment.FileName);
                return null;
            }

            var json = await res.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            return GetRequiredString(json, "content", "download_url");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Échec de l'upload de la pièce jointe GitHub {FileName}", attachment.FileName);
            return null;
        }
    }

    private async Task EnsureAttachmentsBranchExistsAsync(string branch, CancellationToken ct)
    {
        using var checkReq = new HttpRequestMessage(
            HttpMethod.Get,
            $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/git/ref/heads/{branch}");
        checkReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);
        using var checkRes = await _http.SendAsync(checkReq, ct);
        if (checkRes.StatusCode == HttpStatusCode.OK)
            return;

        using var repoReq = new HttpRequestMessage(
            HttpMethod.Get, $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}");
        repoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);
        using var repoRes = await _http.SendAsync(repoReq, ct);
        repoRes.EnsureSuccessStatusCode();
        var repoJson = await repoRes.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var defaultBranch = GetRequiredString(repoJson, "default_branch");

        using var refReq = new HttpRequestMessage(
            HttpMethod.Get,
            $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/git/ref/heads/{defaultBranch}");
        refReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);
        using var refRes = await _http.SendAsync(refReq, ct);
        refRes.EnsureSuccessStatusCode();
        var refJson = await refRes.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var sha = GetRequiredString(refJson, "object", "sha");

        using var createReq = new HttpRequestMessage(
            HttpMethod.Post,
            $"repos/{_options.GitHubRepoOwner}/{_options.GitHubRepoName}/git/refs")
        {
            Content = JsonContent.Create(new { @ref = $"refs/heads/{branch}", sha })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);
        using var createRes = await _http.SendAsync(createReq, ct);
        if (createRes.StatusCode != HttpStatusCode.UnprocessableEntity)
            createRes.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Descend une chaîne de propriétés JSON et lève une <see cref="JsonException"/> lisible
    /// si un segment est absent ou n'est pas une chaîne, plutôt que la KeyNotFoundException
    /// non catchée par UploadAttachmentAsync/EnsureAttachmentsBranchExistsAsync que renverrait
    /// GetProperty sur une réponse GitHub de forme inattendue.
    /// </summary>
    private static string GetRequiredString(JsonElement element, params string[] path)
    {
        var current = element;
        foreach (var segment in path)
        {
            if (!current.TryGetProperty(segment, out current))
                throw new JsonException($"Champ « {segment} » absent de la réponse GitHub.");
        }

        return current.GetString()
            ?? throw new JsonException($"Champ « {path[^1]} » null dans la réponse GitHub.");
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

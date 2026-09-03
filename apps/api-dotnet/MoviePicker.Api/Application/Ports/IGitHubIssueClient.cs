namespace MoviePicker.Api.Application.Ports;

public interface IGitHubIssueClient
{
    Task CreateIssueAsync(GitHubIssueDraft draft, CancellationToken ct = default);

    /// <summary>
    /// Commite l'image sur une branche dédiée du dépôt et retourne son URL brute
    /// (raw.githubusercontent.com), utilisable dans le markdown d'une issue.
    /// Retourne null en cas d'échec (best effort : ne doit jamais bloquer la création de l'issue).
    /// </summary>
    Task<string?> UploadAttachmentAsync(GitHubAttachmentUpload attachment, CancellationToken ct = default);
}

public sealed record GitHubIssueDraft(string Title, string Body, IReadOnlyList<string> Labels);

public sealed record GitHubAttachmentUpload(string FileName, string ContentType, string Base64Content);

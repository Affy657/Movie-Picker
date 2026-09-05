namespace MoviePicker.Api.Application.Ports;

public interface IGitHubIssueClient
{
    Task CreateIssueAsync(GitHubIssueDraft draft, CancellationToken ct = default);

    Task<string?> UploadAttachmentAsync(GitHubAttachmentUpload attachment, CancellationToken ct = default);
}

public sealed record GitHubIssueDraft(string Title, string Body, IReadOnlyList<string> Labels);

public sealed record GitHubAttachmentUpload(string FileName, string ContentType, string Base64Content);

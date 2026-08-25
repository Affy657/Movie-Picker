namespace MoviePicker.Api.Application.Ports;

public interface IGitHubIssueClient
{
    Task CreateIssueAsync(GitHubIssueDraft draft, CancellationToken ct = default);
}

public sealed record GitHubIssueDraft(string Title, string Body, IReadOnlyList<string> Labels);

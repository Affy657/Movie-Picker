using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.IntegrationTests.Helpers;

public sealed class FakeGitHubIssueClient : IGitHubIssueClient
{
    private readonly ConcurrentBag<GitHubIssueDraft> _created = [];
    private readonly ConcurrentBag<GitHubAttachmentUpload> _uploadedAttachments = [];

    public ConcurrentBag<GitHubIssueDraft> CreatedIssues => _created;

    public ConcurrentBag<GitHubAttachmentUpload> UploadedAttachments => _uploadedAttachments;

    public bool ShouldFail { get; set; }

    public Task CreateIssueAsync(GitHubIssueDraft draft, CancellationToken ct = default)
    {
        if (ShouldFail)
            throw new ServiceUnavailableException("Impossible de créer la suggestion pour le moment. Réessayez dans un instant.");

        _created.Add(draft);
        return Task.CompletedTask;
    }

    public Task<string?> UploadAttachmentAsync(GitHubAttachmentUpload attachment, CancellationToken ct = default)
    {
        if (ShouldFail)
            throw new ServiceUnavailableException("Impossible de créer la suggestion pour le moment. Réessayez dans un instant.");

        _uploadedAttachments.Add(attachment);
        return Task.FromResult<string?>($"https://raw.githubusercontent.com/fake/fake/feedback-attachments/{attachment.FileName}");
    }

    public void Clear()
    {
        ShouldFail = false;
        while (_created.TryTake(out _)) { }
        while (_uploadedAttachments.TryTake(out _)) { }
    }
}

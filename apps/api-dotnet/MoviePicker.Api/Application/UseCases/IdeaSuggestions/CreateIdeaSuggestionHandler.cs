using System.Text.RegularExpressions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public sealed class CreateIdeaSuggestionHandler : ICreateIdeaSuggestionHandler
{
    private const int MaxAttachments = 4;

    private readonly IUserRepository _users;
    private readonly IGitHubIssueClient _github;

    public CreateIdeaSuggestionHandler(IUserRepository users, IGitHubIssueClient github)
    {
        _users = users;
        _github = github;
    }

    public async Task HandleAsync(string userId, CreateIdeaSuggestionRequest request, CancellationToken ct = default)
    {
        if (request.Attachments is { Count: > MaxAttachments })
            throw Errors.TooManyAttachments(MaxAttachments);

        if (request.Attachments is not null)
        {
            foreach (var attachment in request.Attachments)
                ValidateAttachmentContent(attachment);
        }

        var user = await _users.GetByIdAsync(userId, ct);
        var screenshotUrls = await UploadAttachmentsAsync(request.Attachments, ct);
        var draft = BuildDraft(request, DescribeAuthor(user, userId), screenshotUrls);
        await _github.CreateIssueAsync(draft, ct);
    }

    private static void ValidateAttachmentContent(IdeaSuggestionAttachmentDto attachment)
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(attachment.Base64Content);
        }
        catch (FormatException)
        {
            throw Errors.AttachmentContentInvalid(attachment.FileName);
        }

        if (ImageSignature.Detect(bytes) != attachment.ContentType)
            throw Errors.AttachmentContentMismatch(attachment.FileName, attachment.ContentType);
    }

    private async Task<List<string>> UploadAttachmentsAsync(
        IReadOnlyList<IdeaSuggestionAttachmentDto>? attachments, CancellationToken ct)
    {
        if (attachments is null || attachments.Count == 0)
            return [];

        var uploads = await Task.WhenAll(attachments.Select(a => _github.UploadAttachmentAsync(
            new GitHubAttachmentUpload(a.FileName, a.ContentType, a.Base64Content),
            ct)));

        return uploads.Where(url => url is not null).Select(url => url!).ToList();
    }

    private static string DescribeAuthor(User? user, string userId)
    {
        if (user is null)
            return userId;
        return string.IsNullOrWhiteSpace(user.Handle)
            ? user.DisplayName
            : $"{user.DisplayName} (@{user.Handle})";
    }

    private static GitHubIssueDraft BuildDraft(
        CreateIdeaSuggestionRequest request, string author, List<string> screenshotUrls)
    {
        var (prefix, label) = request.Category switch
        {
            IdeaSuggestionCategory.Bug => ("Bug", "bug"),
            IdeaSuggestionCategory.Improvement => ("Amélioration", "enhancement"),
            _ => ("Idée", "idée-utilisateur")
        };

        var title = $"[{prefix}] {NeutralizeMentions(request.Title.Trim())}";

        var bodyLines = new List<string>
        {
            NeutralizeMentions(request.Description.Trim()),
            string.Empty,
            "---",
            $"Auteur : {NeutralizeMentions(author)}"
        };
        if (!string.IsNullOrWhiteSpace(request.PagePath))
            bodyLines.Add($"Page : {request.PagePath.Trim()}");
        if (!string.IsNullOrWhiteSpace(request.AppVersion))
            bodyLines.Add($"Version : {request.AppVersion.Trim()}");

        if (screenshotUrls.Count > 0)
        {
            bodyLines.Add(string.Empty);
            bodyLines.Add("### Captures d'écran");
            for (var i = 0; i < screenshotUrls.Count; i++)
                bodyLines.Add($"![capture {i + 1}]({screenshotUrls[i]})");
        }

        return new GitHubIssueDraft(title, string.Join('\n', bodyLines), [label, "user-feedback"]);
    }

    private static readonly Regex MentionPattern = new(
        @"@(?=\w)",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(100));

    private static string NeutralizeMentions(string text) => MentionPattern.Replace(text, "@\u200b");
}

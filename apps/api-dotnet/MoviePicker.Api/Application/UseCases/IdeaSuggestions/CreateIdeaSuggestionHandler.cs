using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public sealed class CreateIdeaSuggestionHandler : ICreateIdeaSuggestionHandler
{
    private const int MaxAttachments = 4;
    private const int ReferenceLength = 12;
    private const string AnyIdentifier = ":param";

    private static readonly HashSet<string> StaticPathSegments = new(StringComparer.Ordinal)
    {
        "au-cinema", "auth", "callback", "collection", "collections", "decouvrir", "e", "films", "forgot-password",
        "integrations", "les-plus-proposes", "login", "mentions-legales", "my-events", "new", "notifications",
        "politique-de-confidentialite", "preferences", "profil", "r", "recherche", "register", "reset", "securite",
        "settings", "similaires", "soutenir", "streaming", "tech", "tendances", "theme", "u", "watchlist"
    };

    private static readonly Dictionary<string, string> IdentifierAfterSegment = new(StringComparer.Ordinal)
    {
        ["e"] = ":slug",
        ["r"] = ":slug",
        ["u"] = ":handle"
    };

    private static readonly Regex PublishableAppVersionPattern = new(
        @"^[0-9A-Za-z.+-]{1,20}\z",
        RegexOptions.CultureInvariant,
        TimeSpan.FromMilliseconds(100));

    private readonly IGitHubIssueClient _github;
    private readonly ILogger<CreateIdeaSuggestionHandler> _logger;

    public CreateIdeaSuggestionHandler(IGitHubIssueClient github, ILogger<CreateIdeaSuggestionHandler> logger)
    {
        _github = github;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, CreateIdeaSuggestionRequest request, CancellationToken ct = default)
    {
        if (request.Attachments is { Count: > MaxAttachments })
            throw Errors.TooManyAttachments(MaxAttachments);

        var uploads = (request.Attachments ?? []).Select(PrepareUpload).ToList();
        var screenshotUrls = await UploadAttachmentsAsync(uploads, ct);
        var reference = RandomNumberGenerator.GetHexString(ReferenceLength, lowercase: true);
        var draft = BuildDraft(request, reference, screenshotUrls);
        await _github.CreateIssueAsync(draft, ct);
        _logger.LogInformation("IdeaSuggestion: published reference {Reference} for {UserId}", reference, userId);
    }

    private static GitHubAttachmentUpload PrepareUpload(IdeaSuggestionAttachmentDto attachment)
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

        var withoutMetadata = ImageMetadataStripper.Strip(bytes, attachment.ContentType)
            ?? throw Errors.AttachmentImageUnreadable(attachment.FileName);

        return new GitHubAttachmentUpload(
            attachment.FileName,
            attachment.ContentType,
            Convert.ToBase64String(withoutMetadata));
    }

    private async Task<List<string>> UploadAttachmentsAsync(
        List<GitHubAttachmentUpload> uploads, CancellationToken ct)
    {
        if (uploads.Count == 0)
            return [];

        var urls = new List<string>(uploads.Count);
        foreach (var upload in uploads)
        {
            if (await _github.UploadAttachmentAsync(upload, ct) is { } url)
                urls.Add(url);
        }

        return urls;
    }

    private static string? PublishablePageTemplate(string? pagePath)
    {
        if (string.IsNullOrWhiteSpace(pagePath))
            return null;

        var path = pagePath.Trim();
        var queryOrFragment = path.IndexOfAny(['?', '#']);
        if (queryOrFragment >= 0)
            path = path[..queryOrFragment];
        if (!path.StartsWith('/'))
            return null;

        var template = new List<string>();
        foreach (var segment in path.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            var word = segment.ToLowerInvariant();
            var previous = template.Count > 0 ? template[^1] : null;
            if (previous is not null && IdentifierAfterSegment.TryGetValue(previous, out var identifier))
                template.Add(identifier);
            else
                template.Add(StaticPathSegments.Contains(word) ? word : AnyIdentifier);
        }

        return "/" + string.Join('/', template);
    }

    private static string? PublishableAppVersion(string? appVersion)
    {
        var version = appVersion?.Trim();
        return !string.IsNullOrEmpty(version) && PublishableAppVersionPattern.IsMatch(version) ? version : null;
    }

    private static GitHubIssueDraft BuildDraft(
        CreateIdeaSuggestionRequest request, string reference, List<string> screenshotUrls)
    {
        var (prefix, label) = request.Category switch
        {
            IdeaSuggestionCategory.Bug => ("Bug", "bug"),
            IdeaSuggestionCategory.Improvement => ("Amélioration", "enhancement"),
            _ => ("Idée", "idée-utilisateur")
        };

        var title = $"[{prefix}] {NeutralizeGitHubReferences(request.Title.Trim())}";

        var bodyLines = new List<string>
        {
            EscapeHtmlCommentOpeners(NeutralizeGitHubReferences(request.Description.Trim())),
            string.Empty,
            "---",
            $"Référence : {reference}"
        };
        var page = PublishablePageTemplate(request.PagePath);
        if (page is not null)
            bodyLines.Add($"Page : {page}");
        var version = PublishableAppVersion(request.AppVersion);
        if (version is not null)
            bodyLines.Add($"Version : {version}");

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

    private static readonly Regex IssueNumberPattern = new(
        @"#(?=\d)",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(100));

    private static readonly Regex GitHubShorthandPattern = new(
        @"\bGH(?=-\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase,
        TimeSpan.FromMilliseconds(100));

    private static readonly Regex GitHubHostPattern = new(
        @"github(?=\.com)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase,
        TimeSpan.FromMilliseconds(100));

    private static string NeutralizeGitHubReferences(string text)
    {
        var neutralized = MentionPattern.Replace(text, "@\u200b");
        neutralized = IssueNumberPattern.Replace(neutralized, "#\u200b");
        neutralized = GitHubShorthandPattern.Replace(neutralized, match => match.Value + "\u200b");
        return GitHubHostPattern.Replace(neutralized, match => match.Value + "\u200b");
    }

    private static string EscapeHtmlCommentOpeners(string markdown) =>
        markdown.Replace("<!--", "&lt;!--", StringComparison.Ordinal);
}

using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public sealed partial class CreateIdeaSuggestionHandler : ICreateIdeaSuggestionHandler
{
    private const int ReferenceLength = 12;
    private const int MaxAppVersionLength = 20;
    private const int NeutralizationTimeoutMilliseconds = 1000;

    private readonly IGitHubIssueClient _github;
    private readonly ILogger<CreateIdeaSuggestionHandler> _logger;

    public CreateIdeaSuggestionHandler(IGitHubIssueClient github, ILogger<CreateIdeaSuggestionHandler> logger)
    {
        _github = github;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, CreateIdeaSuggestionRequest request, CancellationToken ct = default)
    {
        var reference = RandomNumberGenerator.GetHexString(ReferenceLength, lowercase: true);
        var draft = BuildDraft(request, reference);
        await _github.CreateIssueAsync(draft, ct);
        _logger.LogInformation("IdeaSuggestion: published reference {Reference} for {UserId}", reference, LogText.SingleLine(userId));
    }

    private static string? PublishableAppVersion(string? appVersion)
    {
        var version = appVersion?.Trim();
        return version is { Length: > 0 and <= MaxAppVersionLength } && version.All(IsAppVersionCharacter) ? version : null;
    }

    private static bool IsAppVersionCharacter(char character) =>
        char.IsAsciiLetterOrDigit(character) || character is '.' or '+' or '-';

    private static GitHubIssueDraft BuildDraft(CreateIdeaSuggestionRequest request, string reference)
    {
        var (prefix, label) = request.Category switch
        {
            IdeaSuggestionCategory.Bug => (ServerCopy.IdeaIssue.BugPrefix, "bug"),
            IdeaSuggestionCategory.Improvement => (ServerCopy.IdeaIssue.ImprovementPrefix, "enhancement"),
            _ => (ServerCopy.IdeaIssue.IdeaPrefix, "idée-utilisateur")
        };

        var title = ServerCopy.IdeaIssue.Title(prefix, NeutralizeGitHubReferences(request.Title.Trim()));

        var bodyLines = new List<string>
        {
            EscapeHtmlCommentOpeners(NeutralizeGitHubReferences(request.Description.Trim())),
            string.Empty,
            "---",
            ServerCopy.IdeaIssue.Reference(reference)
        };
        var page = PublishablePage.TemplateOf(request.PagePath);
        if (page is not null)
            bodyLines.Add(ServerCopy.IdeaIssue.Page(page));
        var version = PublishableAppVersion(request.AppVersion);
        if (version is not null)
            bodyLines.Add(ServerCopy.IdeaIssue.Version(version));

        return new GitHubIssueDraft(title, string.Join('\n', bodyLines), [label, "user-feedback"]);
    }

    [GeneratedRegex(@"@(?=\w)", RegexOptions.None, NeutralizationTimeoutMilliseconds)]
    private static partial Regex MentionPattern();

    [GeneratedRegex(@"#(?=\d)", RegexOptions.None, NeutralizationTimeoutMilliseconds)]
    private static partial Regex IssueNumberPattern();

    [GeneratedRegex(@"\bGH(?=-\d)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, NeutralizationTimeoutMilliseconds)]
    private static partial Regex GitHubShorthandPattern();

    [GeneratedRegex(@"github(?=\.com)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, NeutralizationTimeoutMilliseconds)]
    private static partial Regex GitHubHostPattern();

    private static string NeutralizeGitHubReferences(string text)
    {
        var neutralized = MentionPattern().Replace(text, "@\u200b");
        neutralized = IssueNumberPattern().Replace(neutralized, "#\u200b");
        neutralized = GitHubShorthandPattern().Replace(neutralized, match => match.Value + "\u200b");
        return GitHubHostPattern().Replace(neutralized, match => match.Value + "\u200b");
    }

    private static string EscapeHtmlCommentOpeners(string markdown) =>
        markdown.Replace("<!--", "&lt;!--", StringComparison.Ordinal);
}

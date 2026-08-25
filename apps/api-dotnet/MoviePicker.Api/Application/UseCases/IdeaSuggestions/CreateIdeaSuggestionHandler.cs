using System.Text.RegularExpressions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public sealed class CreateIdeaSuggestionHandler : ICreateIdeaSuggestionHandler
{
    private readonly IUserRepository _users;
    private readonly IGitHubIssueClient _github;

    public CreateIdeaSuggestionHandler(IUserRepository users, IGitHubIssueClient github)
    {
        _users = users;
        _github = github;
    }

    public async Task HandleAsync(string userId, CreateIdeaSuggestionRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        var draft = BuildDraft(request, DescribeAuthor(user, userId));
        await _github.CreateIssueAsync(draft, ct);
    }

    private static string DescribeAuthor(User? user, string userId)
    {
        if (user is null)
            return userId;
        return string.IsNullOrWhiteSpace(user.Handle)
            ? user.DisplayName
            : $"{user.DisplayName} (@{user.Handle})";
    }

    private static GitHubIssueDraft BuildDraft(CreateIdeaSuggestionRequest request, string author)
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

        return new GitHubIssueDraft(title, string.Join('\n', bodyLines), [label, "user-feedback"]);
    }

    private static readonly Regex MentionPattern = new(
        @"@(?=\w)",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(100));

    /// <summary>
    /// Insère un espace de largeur nulle après chaque « @ » suivi d'un caractère de mot,
    /// pour empêcher qu'un titre/description/pseudo arbitraire ne déclenche une notification
    /// GitHub vers un compte tiers non consentant (mention involontaire ou abus).
    /// </summary>
    private static string NeutralizeMentions(string text) => MentionPattern.Replace(text, "@\u200b");
}

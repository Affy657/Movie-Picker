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
            throw new BadRequestException($"Trop de pièces jointes (maximum {MaxAttachments}).");

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

    /// <summary>
    /// Vérifie que le contenu base64 décodé correspond réellement au ContentType déclaré
    /// (signature binaire), pour empêcher qu'un fichier arbitraire soit committé dans le
    /// dépôt public sous une étiquette « image » trompeuse.
    /// </summary>
    private static void ValidateAttachmentContent(IdeaSuggestionAttachmentDto attachment)
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(attachment.Base64Content);
        }
        catch (FormatException)
        {
            throw new BadRequestException($"Contenu invalide (base64 malformé) pour « {attachment.FileName} ».");
        }

        if (!MatchesContentType(bytes, attachment.ContentType))
            throw new BadRequestException(
                $"Le contenu de « {attachment.FileName} » ne correspond pas au format déclaré ({attachment.ContentType}).");
    }

    private static bool MatchesContentType(ReadOnlySpan<byte> bytes, string contentType) => contentType switch
    {
        "image/png" => bytes.Length >= 8
            && bytes[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
        "image/jpeg" => bytes.Length >= 3 && bytes[..3].SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF }),
        "image/gif" => bytes.Length >= 6
            && bytes[..3].SequenceEqual("GIF"u8)
            && (bytes[3..6].SequenceEqual("87a"u8) || bytes[3..6].SequenceEqual("89a"u8)),
        "image/webp" => bytes.Length >= 12
            && bytes[..4].SequenceEqual("RIFF"u8)
            && bytes[8..12].SequenceEqual("WEBP"u8),
        _ => false
    };

    private async Task<List<string>> UploadAttachmentsAsync(
        IReadOnlyList<IdeaSuggestionAttachmentDto>? attachments, CancellationToken ct)
    {
        if (attachments is null || attachments.Count == 0)
            return [];

        // En parallèle : chaque upload s'assure indépendamment que la branche existe,
        // et une éventuelle course à la création est tolérée (422 "already exists") côté GitHubIssueClient.
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
        CreateIdeaSuggestionRequest request, string author, IReadOnlyList<string> screenshotUrls)
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

    /// <summary>
    /// Insère un espace de largeur nulle après chaque « @ » suivi d'un caractère de mot,
    /// pour empêcher qu'un titre/description/pseudo arbitraire ne déclenche une notification
    /// GitHub vers un compte tiers non consentant (mention involontaire ou abus).
    /// </summary>
    private static string NeutralizeMentions(string text) => MentionPattern.Replace(text, "@\u200b");
}

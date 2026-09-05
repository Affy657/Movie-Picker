using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.IdeaSuggestions;

public sealed class CreateIdeaSuggestionHandlerTests
{
    private const string UserId = "u1";

    private const string ValidPngBase64 = "iVBORw0KGgo=";

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IGitHubIssueClient> _github = new();
    private readonly CreateIdeaSuggestionHandler _sut;

    public CreateIdeaSuggestionHandlerTests()
    {
        _sut = new CreateIdeaSuggestionHandler(_users.Object, _github.Object);
    }

    private static CreateIdeaSuggestionRequest Request(
        IdeaSuggestionCategory category = IdeaSuggestionCategory.Idea,
        IReadOnlyList<IdeaSuggestionAttachmentDto>? attachments = null) => new()
        {
            Category = category,
            Title = "Ajouter un mode battle",
            Description = "Ce serait top d'avoir un mode tournoi.",
            PagePath = "/e/abc123",
            AppVersion = "1.4.0",
            Attachments = attachments
        };

    private static User Author() => new()
    {
        Id = UserId,
        DisplayName = "Alice",
        Handle = "alice",
        Email = "alice@test.local"
    };

    [Fact]
    public async Task HandleAsync_BuildsIssueWithCategoryLabel_AndAuthorContext()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(Author());
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, Request());

        Assert.NotNull(captured);
        Assert.StartsWith("[Idée]", captured!.Title);
        Assert.Contains("Ajouter un mode battle", captured.Title);
        Assert.Contains("Ce serait top d'avoir un mode tournoi.", captured.Body);
        Assert.Contains("Alice (@alice)", captured.Body);
        Assert.Contains("/e/abc123", captured.Body);
        Assert.Contains("1.4.0", captured.Body);
        Assert.Contains("idée-utilisateur", captured.Labels);
    }

    [Theory]
    [InlineData(IdeaSuggestionCategory.Bug, "[Bug]", "bug")]
    [InlineData(IdeaSuggestionCategory.Improvement, "[Amélioration]", "enhancement")]
    public async Task HandleAsync_MapsCategoryToExpectedPrefixAndLabel(
        IdeaSuggestionCategory category, string expectedPrefix, string expectedLabel)
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(Author());
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, Request(category));

        Assert.NotNull(captured);
        Assert.StartsWith(expectedPrefix, captured!.Title);
        Assert.Contains(expectedLabel, captured.Labels);
    }

    [Fact]
    public async Task HandleAsync_UnknownUser_FallsBackToUserId()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, Request());

        Assert.NotNull(captured);
        Assert.Contains(UserId, captured!.Body);
    }

    [Fact]
    public async Task HandleAsync_NeutralizesGitHubMentions_InTitleDescriptionAndAuthor()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = UserId, DisplayName = "@admin", Handle = "alice", Email = "alice@test.local" });
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, new CreateIdeaSuggestionRequest
        {
            Category = IdeaSuggestionCategory.Idea,
            Title = "Ping @torvalds pour avis",
            Description = "Merci @octocat de regarder ça"
        });

        Assert.NotNull(captured);
        Assert.False(captured!.Title.Contains("@torvalds", StringComparison.Ordinal));
        Assert.True(captured.Title.Contains("@\u200btorvalds", StringComparison.Ordinal));
        Assert.False(captured.Body.Contains("@octocat", StringComparison.Ordinal));
        Assert.True(captured.Body.Contains("@\u200boctocat", StringComparison.Ordinal));
        Assert.True(captured.Body.Contains("@\u200badmin", StringComparison.Ordinal));
    }

    [Fact]
    public async Task HandleAsync_GitHubClientFails_PropagatesServiceUnavailable()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(Author());
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ServiceUnavailableException("Impossible de créer la suggestion pour le moment. Réessayez dans un instant."));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => _sut.HandleAsync(UserId, Request()));
    }

    [Fact]
    public async Task HandleAsync_WithAttachments_UploadsEachAndAppendsScreenshotsSectionToBody()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(Author());
        _github.Setup(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((GitHubAttachmentUpload a, CancellationToken _) => $"https://raw.githubusercontent.com/x/{a.FileName}");
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        var request = Request(attachments:
        [
            new IdeaSuggestionAttachmentDto { FileName = "a.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
            new IdeaSuggestionAttachmentDto { FileName = "b.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
        ]);

        await _sut.HandleAsync(UserId, request);

        Assert.NotNull(captured);
        Assert.Contains("### Captures d'écran", captured!.Body);
        Assert.Contains("![capture 1](https://raw.githubusercontent.com/x/a.png)", captured.Body);
        Assert.Contains("![capture 2](https://raw.githubusercontent.com/x/b.png)", captured.Body);
        _github.Verify(
            g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task HandleAsync_AttachmentUploadFails_SkipsItButStillCreatesIssue()
    {
        _users.Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(Author());
        _github.Setup(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        var request = Request(attachments:
        [
            new IdeaSuggestionAttachmentDto { FileName = "a.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
        ]);

        await _sut.HandleAsync(UserId, request);

        Assert.NotNull(captured);
        Assert.DoesNotContain("Captures d'écran", captured!.Body);
    }

    [Fact]
    public async Task HandleAsync_TooManyAttachments_ThrowsBadRequest_WithoutCallingGitHub()
    {
        var request = Request(attachments: Enumerable.Range(0, 5)
            .Select(i => new IdeaSuggestionAttachmentDto
            {
                FileName = $"{i}.png",
                ContentType = "image/png",
                Base64Content = "QQ=="
            })
            .ToList());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, request));

        _github.Verify(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()), Times.Never);
        _github.Verify(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AttachmentContentDoesNotMatchDeclaredType_ThrowsBadRequest_WithoutCallingGitHub()
    {
        var request = Request(attachments:
        [
            new IdeaSuggestionAttachmentDto { FileName = "fake.png", ContentType = "image/png", Base64Content = "QQ==" },
        ]);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, request));

        _github.Verify(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()), Times.Never);
        _github.Verify(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AttachmentBase64Malformed_ThrowsBadRequest_WithoutCallingGitHub()
    {
        var request = Request(attachments:
        [
            new IdeaSuggestionAttachmentDto { FileName = "bad.png", ContentType = "image/png", Base64Content = "not-base64!!" },
        ]);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, request));

        _github.Verify(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

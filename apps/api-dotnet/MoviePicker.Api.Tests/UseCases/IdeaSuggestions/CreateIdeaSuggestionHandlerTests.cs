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

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IGitHubIssueClient> _github = new();
    private readonly CreateIdeaSuggestionHandler _sut;

    public CreateIdeaSuggestionHandlerTests()
    {
        _sut = new CreateIdeaSuggestionHandler(_users.Object, _github.Object);
    }

    private static CreateIdeaSuggestionRequest Request(
        IdeaSuggestionCategory category = IdeaSuggestionCategory.Idea) => new()
        {
            Category = category,
            Title = "Ajouter un mode battle",
            Description = "Ce serait top d'avoir un mode tournoi.",
            PagePath = "/e/abc123",
            AppVersion = "1.4.0"
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
}

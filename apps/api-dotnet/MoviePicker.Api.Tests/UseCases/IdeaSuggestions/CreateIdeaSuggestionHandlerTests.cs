using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.IdeaSuggestions;

public sealed partial class CreateIdeaSuggestionHandlerTests
{
    private const string UserId = "6512bd43d9caa6e02c990b0a";

    private const string ValidPngBase64 = "iVBORw0KGgo=";

    private readonly Mock<IGitHubIssueClient> _github = new();
    private readonly RecordingLogger _logger = new();
    private readonly CreateIdeaSuggestionHandler _sut;

    public CreateIdeaSuggestionHandlerTests()
    {
        _sut = new CreateIdeaSuggestionHandler(_github.Object, _logger);
    }

    private sealed class RecordingLogger : ILogger<CreateIdeaSuggestionHandler>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }

    private static CreateIdeaSuggestionRequest Request(
        IdeaSuggestionCategory category = IdeaSuggestionCategory.Idea,
        IReadOnlyList<IdeaSuggestionAttachmentDto>? attachments = null,
        string? pagePath = "/e/abc123",
        string? appVersion = "1.4.0") => new()
        {
            Category = category,
            Title = "Ajouter un mode battle",
            Description = "Ce serait top d'avoir un mode tournoi.",
            PagePath = pagePath,
            AppVersion = appVersion,
            Attachments = attachments
        };

    [Fact]
    public async Task HandleAsync_BuildsIssueWithCategoryLabel_AndAnOpaqueAuthorReference()
    {
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, Request());

        Assert.NotNull(captured);
        Assert.StartsWith("[Idée]", captured!.Title);
        Assert.Contains("Ajouter un mode battle", captured.Title);
        Assert.Contains("Ce serait top d'avoir un mode tournoi.", captured.Body);
        Assert.Matches(ReferenceLine(), captured.Body);
        Assert.DoesNotContain(UserId, captured.Body);
        Assert.Contains("Page : /e/:slug", captured.Body);
        Assert.DoesNotContain("abc123", captured.Body);
        Assert.Contains("Version : 1.4.0", captured.Body);
        Assert.Contains("idée-utilisateur", captured.Labels);
    }

    [Fact]
    public async Task HandleAsync_LogsWhichAccountTheReferenceBelongsTo()
    {
        var draft = await CaptureDraftAsync(Request());

        var reference = ReferenceValue().Match(draft.Body).Groups[1].Value;
        var entry = Assert.Single(_logger.Messages, message => message.Contains(reference, StringComparison.Ordinal));
        Assert.Contains(UserId, entry);
    }

    [Fact]
    public async Task HandleAsync_GivesEverySuggestionItsOwnReference()
    {
        var first = await CaptureDraftAsync(Request());
        var second = await CaptureDraftAsync(Request());

        Assert.NotEqual(
            ReferenceValue().Match(first.Body).Groups[1].Value,
            ReferenceValue().Match(second.Body).Groups[1].Value);
    }

    [Theory]
    [InlineData(IdeaSuggestionCategory.Bug, "[Bug]", "bug")]
    [InlineData(IdeaSuggestionCategory.Improvement, "[Amélioration]", "enhancement")]
    public async Task HandleAsync_MapsCategoryToExpectedPrefixAndLabel(
        IdeaSuggestionCategory category, string expectedPrefix, string expectedLabel)
    {
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
    public async Task HandleAsync_NeutralizesGitHubMentions_InTitleAndDescription()
    {
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
    }

    [Fact]
    public async Task HandleAsync_NeutralizesIssueReferencesAndHtmlComments_InTheDescription()
    {
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, new CreateIdeaSuggestionRequest
        {
            Category = IdeaSuggestionCategory.Idea,
            Title = "Comme #12",
            Description = "Voir #12, torvalds/linux#34, GH-5 et https://github.com/x/y/issues/9\n<!-- tout le reste disparaît"
        });

        Assert.NotNull(captured);
        Assert.DoesNotContain("#12", captured!.Title, StringComparison.Ordinal);
        foreach (var reference in new[] { "#12", "linux#34", "GH-5", "github.com/x/y/issues/9", "<!--" })
            Assert.DoesNotContain(reference, captured.Body, StringComparison.Ordinal);
        Assert.Contains("Référence :", captured.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_GitHubClientFails_PropagatesServiceUnavailable()
    {
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.SuggestionUnavailable());

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => _sut.HandleAsync(UserId, Request()));
    }

    [Fact]
    public async Task HandleAsync_WithAttachments_UploadsEachAndAppendsScreenshotsSectionToBody()
    {
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
    public async Task HandleAsync_WithAttachments_UploadsThemOneAfterTheOther()
    {
        var inFlight = 0;
        var mostAtOnce = 0;
        _github.Setup(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()))
            .Returns(async (GitHubAttachmentUpload a, CancellationToken _) =>
            {
                mostAtOnce = Math.Max(mostAtOnce, Interlocked.Increment(ref inFlight));
                await Task.Delay(20);
                Interlocked.Decrement(ref inFlight);
                return $"https://raw.githubusercontent.com/x/{a.FileName}";
            });

        await _sut.HandleAsync(UserId, Request(attachments:
        [
            new IdeaSuggestionAttachmentDto { FileName = "a.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
            new IdeaSuggestionAttachmentDto { FileName = "b.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
            new IdeaSuggestionAttachmentDto { FileName = "c.png", ContentType = "image/png", Base64Content = ValidPngBase64 },
        ]));

        Assert.Equal(1, mostAtOnce);
    }

    [Fact]
    public async Task HandleAsync_AttachmentUploadFails_SkipsItButStillCreatesIssue()
    {
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

    private async Task<GitHubIssueDraft> CaptureDraftAsync(CreateIdeaSuggestionRequest request)
    {
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);
        await _sut.HandleAsync(UserId, request);
        Assert.NotNull(captured);
        return captured!;
    }

    [Theory]
    [InlineData("/e/Ab3dE_9xYz", "/e/:slug")]
    [InlineData("/E/Ab3dE_9xYz", "/e/:slug")]
    [InlineData("/r/Ab3dE_9xYz", "/r/:slug")]
    [InlineData("/u/alice", "/u/:handle")]
    [InlineData("/u/alice/watchlist", "/u/:handle/watchlist")]
    [InlineData("/u/films", "/u/:handle")]
    [InlineData("/e/settings", "/e/:slug")]
    [InlineData("/films/theme/horreur", "/films/theme/:param")]
    [InlineData("/films/similaires/603", "/films/similaires/:param")]
    [InlineData("/settings/securite", "/settings/securite")]
    [InlineData("/", "/")]
    [InlineData("/invite/Zx81Qp", "/:param/:param")]
    [InlineData("/films\n#x", "/:param")]
    [InlineData("/e/Ab3dE_9xYz?host=secret#top", "/e/:slug")]
    public async Task HandleAsync_PublishesThePageTemplate_NeverTheIdentifierItCarries(string pagePath, string published)
    {
        var draft = await CaptureDraftAsync(Request(pagePath: pagePath));

        Assert.Contains($"Page : {published}\n", draft.Body + "\n");
        Assert.DoesNotContain("Ab3dE_9xYz", draft.Body);
        Assert.DoesNotContain("alice", draft.Body);
        Assert.DoesNotContain("secret", draft.Body);
        Assert.DoesNotContain("Zx81Qp", draft.Body);
        Assert.DoesNotContain("horreur", draft.Body);
    }

    [Fact]
    public async Task HandleAsync_LeavesOutAPageOrVersionThatDoesNotLookLikeOne()
    {
        var draft = await CaptureDraftAsync(Request(
            pagePath: "@torvalds @octocat\n\n## Announcement\n[link](https://phish.example)",
            appVersion: "1.0 @admin"));

        Assert.DoesNotContain("Page :", draft.Body);
        Assert.DoesNotContain("Version :", draft.Body);
        Assert.DoesNotContain("torvalds", draft.Body);
        Assert.DoesNotContain("admin", draft.Body);
        Assert.DoesNotContain("phish.example", draft.Body);
    }

    [Fact]
    public async Task HandleAsync_UploadsTheScreenshotWithoutItsMetadata()
    {
        var jpegWithExif = new byte[] { 0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x0C }
            .Concat("Exif\0\0GPS!"u8.ToArray())
            .Concat(new byte[] { 0xFF, 0xDA, 0x00, 0x02, 0x01, 0x02, 0xFF, 0xD9 })
            .ToArray();
        GitHubAttachmentUpload? uploaded = null;
        _github.Setup(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubAttachmentUpload, CancellationToken>((u, _) => uploaded = u)
            .ReturnsAsync("https://raw.githubusercontent.com/x/a.jpg");

        await CaptureDraftAsync(Request(attachments:
        [
            new IdeaSuggestionAttachmentDto
            {
                FileName = "photo.jpg",
                ContentType = "image/jpeg",
                Base64Content = Convert.ToBase64String(jpegWithExif)
            }
        ]));

        Assert.NotNull(uploaded);
        var bytes = Convert.FromBase64String(uploaded!.Base64Content);
        Assert.Equal(new byte[] { 0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02, 0x01, 0x02, 0xFF, 0xD9 }, bytes);
    }

    [Fact]
    public async Task HandleAsync_AnImageThatCannotBeCleaned_ThrowsBadRequest_WithoutCallingGitHub()
    {
        var truncatedJpeg = new byte[] { 0xFF, 0xD8, 0xFF, 0xE1, 0x10, 0x00, 0x45, 0x78 };
        var request = Request(attachments:
        [
            new IdeaSuggestionAttachmentDto
            {
                FileName = "broken.jpg",
                ContentType = "image/jpeg",
                Base64Content = Convert.ToBase64String(truncatedJpeg)
            }
        ]);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, request));

        Assert.Equal(ErrorCodes.AttachmentImageUnreadable, ex.Reason);
        _github.Verify(g => g.UploadAttachmentAsync(It.IsAny<GitHubAttachmentUpload>(), It.IsAny<CancellationToken>()), Times.Never);
        _github.Verify(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [GeneratedRegex("^Référence : [0-9a-f]{12}$", RegexOptions.Multiline)]
    private static partial Regex ReferenceLine();

    [GeneratedRegex("Référence : ([0-9a-f]{12})")]
    private static partial Regex ReferenceValue();
}

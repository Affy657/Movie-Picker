using System.Reflection;
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
        string? pagePath = "/e/abc123",
        string? appVersion = "1.4.0") => new()
        {
            Category = category,
            Title = "Ajouter un mode battle",
            Description = "Ce serait top d'avoir un mode tournoi.",
            PagePath = pagePath,
            AppVersion = appVersion
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
    public async Task HandleAsync_KeepsAnHtmlCommentOpenerAsTypedInThePlainTextTitle()
    {
        GitHubIssueDraft? captured = null;
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .Callback<GitHubIssueDraft, CancellationToken>((d, _) => captured = d)
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync(UserId, new CreateIdeaSuggestionRequest
        {
            Category = IdeaSuggestionCategory.Bug,
            Title = "Bug with <!-- in notes, see #12",
            Description = "Repro"
        });

        Assert.NotNull(captured);
        Assert.Equal("[Bug] Bug with <!-- in notes, see #​12", captured!.Title);
    }

    [Fact]
    public async Task HandleAsync_GitHubClientFails_PropagatesServiceUnavailable()
    {
        _github.Setup(g => g.CreateIssueAsync(It.IsAny<GitHubIssueDraft>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.SuggestionUnavailable());

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => _sut.HandleAsync(UserId, Request()));
    }

    [Fact]
    public void GitHubPort_OnlyOpensIssues_SoNothingAUserSendsIsWrittenInTheRepository()
    {
        Assert.Equal(
            [nameof(IGitHubIssueClient.CreateIssueAsync)],
            typeof(IGitHubIssueClient).GetMethods().Select(method => method.Name));
    }

    [Fact]
    public void Request_CarriesNoAttachment()
    {
        Assert.DoesNotContain(
            typeof(CreateIdeaSuggestionRequest).GetProperties(),
            property => property.Name.Contains("Attachment", StringComparison.Ordinal));
    }

    [Fact]
    public async Task HandleAsync_PublishesNoScreenshotSection()
    {
        var draft = await CaptureDraftAsync(Request());

        Assert.DoesNotContain("Captures", draft.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("![", draft.Body, StringComparison.Ordinal);
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

    [Theory]
    [InlineData("1.31.0")]
    [InlineData(" 1.31.0 ")]
    [InlineData("2.0.0-rc.1+build.7")]
    [InlineData("12345678901234567890")]
    public async Task HandleAsync_PublishesAVersionMadeOfAsciiLettersDigitsAndSeparators(string appVersion)
    {
        var draft = await CaptureDraftAsync(Request(appVersion: appVersion));

        Assert.Contains($"Version : {appVersion.Trim()}\n", draft.Body + "\n");
    }

    [Theory]
    [InlineData("123456789012345678901")]
    [InlineData("1_0")]
    [InlineData("١.٢.٣")]
    [InlineData("1.0\n## Hi")]
    [InlineData("   ")]
    public async Task HandleAsync_LeavesOutAVersionWithAnyOtherCharacterOrOverTwentyLong(string appVersion)
    {
        var draft = await CaptureDraftAsync(Request(appVersion: appVersion));

        Assert.DoesNotContain("Version :", draft.Body);
    }

    [Fact]
    public void EveryRegexOfTheHandler_IsPrecompiledAndGivesALoadedMachineAtLeastASecond()
    {
        var regexes = RegexesDeclaredBy(typeof(CreateIdeaSuggestionHandler));

        Assert.NotEmpty(regexes);
        Assert.All(regexes, regex =>
        {
            Assert.False(
                regex.GetType() == typeof(Regex) && !regex.Options.HasFlag(RegexOptions.Compiled),
                $"interpreted regex {regex}");
            Assert.True(
                regex.MatchTimeout == Regex.InfiniteMatchTimeout || regex.MatchTimeout >= TimeSpan.FromSeconds(1),
                $"regex {regex} gives up after {regex.MatchTimeout.TotalMilliseconds} ms");
        });
    }

    private static List<Regex> RegexesDeclaredBy(Type type)
    {
        const BindingFlags everyStatic = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
        var fields = type.GetFields(everyStatic)
            .Where(field => typeof(Regex).IsAssignableFrom(field.FieldType))
            .Select(field => (Regex)field.GetValue(null)!);
        var factories = type.GetMethods(everyStatic)
            .Where(method => typeof(Regex).IsAssignableFrom(method.ReturnType) && method.GetParameters().Length == 0)
            .Select(method => (Regex)method.Invoke(null, null)!);
        return fields.Concat(factories).ToList();
    }

    [GeneratedRegex("^Référence : [0-9a-f]{12}$", RegexOptions.Multiline)]
    private static partial Regex ReferenceLine();

    [GeneratedRegex("Référence : ([0-9a-f]{12})")]
    private static partial Regex ReferenceValue();
}

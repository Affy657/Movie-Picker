using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventTemplates;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventTemplates;

internal sealed class FrozenClock : TimeProvider
{
    private readonly DateTimeOffset _now;

    public FrozenClock(DateTimeOffset now) => _now = now;

    public override DateTimeOffset GetUtcNow() => _now;
}

internal static class TemplateFixtures
{
    public static readonly DateTimeOffset Now = new(2026, 9, 10, 18, 0, 0, TimeSpan.Zero);

    public static EventTemplate Template(string id, string name, EventConfig? config = null) =>
        new()
        {
            Id = id,
            Name = name,
            Config = config ?? new EventConfig { WheelMode = WheelMode.WeightedByVotes },
            CreatedAt = Now.AddDays(-1)
        };

    public static User WithTemplates(params EventTemplate[] templates) =>
        new() { Id = "u1", EventTemplates = templates };

    public static SaveEventTemplateRequest Request(
        string? name = "Soirée horreur",
        string? theme = "🎃 Halloween",
        int? maxProposals = 3,
        int? maxParticipants = 8,
        WheelMode? wheelMode = WheelMode.WeightedByVotes,
        bool? allowSeries = false,
        bool? richSharePreview = true,
        int? winnerCount = null,
        int? maxVotes = 2) =>
        new()
        {
            Name = name,
            Theme = theme,
            MaxProposalsPerParticipant = maxProposals,
            MaxParticipants = maxParticipants,
            MaxVotesPerParticipant = maxVotes,
            WheelMode = wheelMode,
            AllowSeries = allowSeries,
            RichSharePreview = richSharePreview,
            WinnerCount = winnerCount
        };
}

public sealed class ListEventTemplatesHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly ListEventTemplatesHandler _sut;

    public ListEventTemplatesHandlerTests()
    {
        _sut = new ListEventTemplatesHandler(_users.Object);
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1"));
    }

    [Fact]
    public async Task HandleAsync_NoTemplates_ReturnsEmptyList()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1" });

        var result = await _sut.HandleAsync("u1");

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_KeepsStoredOrder()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TemplateFixtures.WithTemplates(
                TemplateFixtures.Template("t1", "Soirée horreur"),
                TemplateFixtures.Template("t2", "Ciné du dimanche")));

        var result = await _sut.HandleAsync("u1");

        Assert.Equal(["Soirée horreur", "Ciné du dimanche"], result.Items.Select(i => i.Name));
    }

    [Fact]
    public async Task HandleAsync_ProjectsTheWholeConfig()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TemplateFixtures.WithTemplates(
                TemplateFixtures.Template("t1", "Soirée horreur", new EventConfig
                {
                    Theme = "🎃 Halloween",
                    MaxProposalsPerParticipant = 3,
                    MaxParticipants = 8,
                    MaxVotesPerParticipant = 2,
                    WheelMode = WheelMode.StrictRandom,
                    AllowSeries = true
                })));

        var listed = await _sut.HandleAsync("u1");
        var item = Assert.Single(listed.Items);

        Assert.Equal("t1", item.Id);
        Assert.Equal("🎃 Halloween", item.Theme);
        Assert.Equal(3, item.MaxProposalsPerParticipant);
        Assert.Equal(8, item.MaxParticipants);
        Assert.Equal(2, item.MaxVotesPerParticipant);
        Assert.Equal(WheelMode.StrictRandom, item.WheelMode);
        Assert.True(item.AllowSeries);
    }
}

public sealed class CreateEventTemplateHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly CreateEventTemplateHandler _sut;

    public CreateEventTemplateHandlerTests()
    {
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _sut = new CreateEventTemplateHandler(_users.Object, new FrozenClock(TemplateFixtures.Now));
    }

    private void HasUser(User user) =>
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(user);

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request()));
    }

    [Fact]
    public async Task HandleAsync_AppendsToTheList()
    {
        HasUser(TemplateFixtures.WithTemplates(TemplateFixtures.Template("t1", "Ciné du dimanche")));
        User? saved = null;
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback((User u, CancellationToken _) => saved = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request());

        Assert.NotNull(saved);
        Assert.Equal(["Ciné du dimanche", "Soirée horreur"], saved!.EventTemplates.Select(t => t.Name));
        Assert.False(string.IsNullOrEmpty(created.Id));
        Assert.Equal(TemplateFixtures.Now, saved.EventTemplates[1].CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_TrimsNameAndTheme()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync(
            "u1",
            TemplateFixtures.Request(name: "  Soirée horreur  ", theme: "  🎃 Halloween  "));

        Assert.Equal("Soirée horreur", created.Name);
        Assert.Equal("🎃 Halloween", created.Theme);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_BlankName_Throws(string? name)
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(name: name)));
    }

    [Fact]
    public async Task HandleAsync_NameTooLong_Throws()
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(name: new string('a', EventTemplate.MaxNameLength + 1))));
    }

    [Fact]
    public async Task HandleAsync_DuplicateNameIgnoringCase_Throws()
    {
        HasUser(TemplateFixtures.WithTemplates(TemplateFixtures.Template("t1", "Soirée horreur")));

        await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(name: "SOIRÉE HORREUR")));
    }

    [Fact]
    public async Task HandleAsync_CapReached_Throws()
    {
        var full = Enumerable.Range(1, EventTemplate.MaxPerUser)
            .Select(i => TemplateFixtures.Template($"t{i}", $"Template {i}"))
            .ToArray();
        HasUser(TemplateFixtures.WithTemplates(full));

        await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(name: "Un de trop")));
    }

    [Fact]
    public async Task HandleAsync_BlankTheme_StoresNull()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(theme: "   "));

        Assert.Null(created.Theme);
    }

    [Fact]
    public async Task HandleAsync_ZeroLimits_MeanNoLimit()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync(
            "u1",
            TemplateFixtures.Request(maxProposals: 0, maxParticipants: 0, maxVotes: 0));

        Assert.Null(created.MaxProposalsPerParticipant);
        Assert.Null(created.MaxParticipants);
        Assert.Null(created.MaxVotesPerParticipant);
    }

    [Fact]
    public async Task HandleAsync_MaxVotes_IsStoredInTheTemplate()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(maxVotes: 4));

        Assert.Equal(4, created.MaxVotesPerParticipant);
    }

    [Fact]
    public async Task HandleAsync_MaxVotesNegative_Throws()
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(maxVotes: -1)));
    }

    [Fact]
    public async Task HandleAsync_KeepsTheWinnerCount()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(winnerCount: 3));

        Assert.Equal(3, created.WinnerCount);
    }

    [Fact]
    public async Task HandleAsync_MissingWinnerCount_FallsBackToOne()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request());

        Assert.Equal(EventConfig.DefaultWinnerCount, created.WinnerCount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(EventConfig.WinnerCountCap + 1)]
    public async Task HandleAsync_WinnerCountOutOfRange_Throws(int value)
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(winnerCount: value)));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(EventConfig.MaxProposalsPerParticipantCap + 1)]
    public async Task HandleAsync_MaxProposalsOutOfRange_Throws(int value)
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(maxProposals: value)));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(EventConfig.MaxParticipantsCap + 1)]
    public async Task HandleAsync_MaxParticipantsOutOfRange_Throws(int value)
    {
        HasUser(new User { Id = "u1" });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", TemplateFixtures.Request(maxParticipants: value)));
    }

    [Fact]
    public async Task HandleAsync_MissingWheelMode_FallsBackToWeighted()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(wheelMode: null));

        Assert.Equal(WheelMode.WeightedByVotes, created.WheelMode);
    }


    [Fact]
    public async Task HandleAsync_KeepsRichSharePreviewDisabled()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(richSharePreview: false));

        Assert.False(created.RichSharePreview);
    }

    [Fact]
    public async Task HandleAsync_MissingRichSharePreview_DefaultsToEnabled()
    {
        HasUser(new User { Id = "u1" });

        var created = await _sut.HandleAsync("u1", TemplateFixtures.Request(richSharePreview: null));

        Assert.True(created.RichSharePreview);
    }
    [Fact]
    public async Task HandleAsync_TouchesUpdatedAt()
    {
        HasUser(new User { Id = "u1", UpdatedAt = TemplateFixtures.Now.AddDays(-5) });
        User? saved = null;
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback((User u, CancellationToken _) => saved = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        await _sut.HandleAsync("u1", TemplateFixtures.Request());

        Assert.Equal(TemplateFixtures.Now, saved!.UpdatedAt);
    }
}

public sealed class UpdateEventTemplateHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly UpdateEventTemplateHandler _sut;
    private User? _saved;

    public UpdateEventTemplateHandlerTests()
    {
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback((User u, CancellationToken _) => _saved = u)
            .ReturnsAsync((User u, CancellationToken _) => u);
        _sut = new UpdateEventTemplateHandler(_users.Object, new FrozenClock(TemplateFixtures.Now));
    }

    private void HasUser(User user) =>
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(user);

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("u1", "t1", TemplateFixtures.Request()));
    }

    [Fact]
    public async Task HandleAsync_UnknownTemplate_Throws()
    {
        HasUser(TemplateFixtures.WithTemplates(TemplateFixtures.Template("t1", "Soirée horreur")));

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("u1", "nope", TemplateFixtures.Request()));
    }

    [Fact]
    public async Task HandleAsync_KeepsIdAndCreationDate()
    {
        var original = TemplateFixtures.Template("t1", "Soirée horreur");
        HasUser(TemplateFixtures.WithTemplates(original));

        var updated = await _sut.HandleAsync("u1", "t1", TemplateFixtures.Request(name: "Soirée frissons"));

        Assert.Equal("t1", updated.Id);
        Assert.Equal("Soirée frissons", updated.Name);
        Assert.Equal(original.CreatedAt, _saved!.EventTemplates.Single().CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_KeepsPositionInTheList()
    {
        HasUser(TemplateFixtures.WithTemplates(
            TemplateFixtures.Template("t1", "Soirée horreur"),
            TemplateFixtures.Template("t2", "Ciné du dimanche"),
            TemplateFixtures.Template("t3", "Marathon série")));

        await _sut.HandleAsync("u1", "t2", TemplateFixtures.Request(name: "Ciné du soir"));

        Assert.Equal(
            ["Soirée horreur", "Ciné du soir", "Marathon série"],
            _saved!.EventTemplates.Select(t => t.Name));
    }

    [Fact]
    public async Task HandleAsync_ReusingItsOwnName_IsAllowed()
    {
        HasUser(TemplateFixtures.WithTemplates(TemplateFixtures.Template("t1", "Soirée horreur")));

        var updated = await _sut.HandleAsync("u1", "t1", TemplateFixtures.Request(maxProposals: 5));

        Assert.Equal("Soirée horreur", updated.Name);
        Assert.Equal(5, updated.MaxProposalsPerParticipant);
    }

    [Fact]
    public async Task HandleAsync_TakingAnotherTemplateName_Throws()
    {
        HasUser(TemplateFixtures.WithTemplates(
            TemplateFixtures.Template("t1", "Soirée horreur"),
            TemplateFixtures.Template("t2", "Ciné du dimanche")));

        await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("u1", "t2", TemplateFixtures.Request(name: "soirée horreur")));
    }

    [Fact]
    public async Task HandleAsync_ReplacesTheWholeConfig()
    {
        HasUser(TemplateFixtures.WithTemplates(
            TemplateFixtures.Template("t1", "Soirée horreur", new EventConfig
            {
                Theme = "🎃 Halloween",
                MaxProposalsPerParticipant = 3,
                AllowSeries = true
            })));

        var updated = await _sut.HandleAsync(
            "u1",
            "t1",
            TemplateFixtures.Request(theme: null, maxProposals: 5, allowSeries: false));

        Assert.Null(updated.Theme);
        Assert.Equal(5, updated.MaxProposalsPerParticipant);
        Assert.False(updated.AllowSeries);
    }
}

public sealed class DeleteEventTemplateHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly DeleteEventTemplateHandler _sut;
    private User? _saved;

    public DeleteEventTemplateHandlerTests()
    {
        _users.Setup(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback((User u, CancellationToken _) => _saved = u)
            .ReturnsAsync((User u, CancellationToken _) => u);
        _sut = new DeleteEventTemplateHandler(_users.Object, new FrozenClock(TemplateFixtures.Now));
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1", "t1"));
    }

    [Fact]
    public async Task HandleAsync_UnknownTemplate_Throws()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TemplateFixtures.WithTemplates(TemplateFixtures.Template("t1", "Soirée horreur")));

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1", "nope"));
    }

    [Fact]
    public async Task HandleAsync_RemovesOnlyThatTemplate()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(TemplateFixtures.WithTemplates(
                TemplateFixtures.Template("t1", "Soirée horreur"),
                TemplateFixtures.Template("t2", "Ciné du dimanche")));

        await _sut.HandleAsync("u1", "t1");

        Assert.Equal(["Ciné du dimanche"], _saved!.EventTemplates.Select(t => t.Name));
        Assert.Equal(TemplateFixtures.Now, _saved.UpdatedAt);
    }
}

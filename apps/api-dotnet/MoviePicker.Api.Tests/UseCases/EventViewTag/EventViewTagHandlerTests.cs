using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventViewTag;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventViewTag;

public sealed class EventViewTagHandlerTests
{
    private static readonly DateTimeOffset Noon = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static Event EventWith(long writeSeq, long version = 3) =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Build() with
        {
            CreatorUserId = "host-user",
            HostToken = "host-token",
            WriteSeq = writeSeq,
            Version = version
        };

    private EventViewTagHandler Handler(DateTimeOffset now) =>
        new(_events.Object, _hostToken.Object, _currentUser.Object, new FakeTimeProvider(now));

    private void Stored(Event evt) =>
        _events.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    [Fact]
    public async Task HandleAsync_UnknownEvent_ReturnsNull()
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("missing", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        Assert.Null(await Handler(Noon).HandleAsync("missing"));
    }

    [Fact]
    public async Task HandleAsync_IsAWeakEntityTag()
    {
        Stored(EventWith(writeSeq: 7));

        var tag = await Handler(Noon).HandleAsync("soiree");

        Assert.StartsWith("W/\"", tag);
        Assert.EndsWith("\"", tag);
    }

    [Fact]
    public async Task HandleAsync_SameViewer_ChangesOnceAcrossAFreshnessWindow()
    {
        Stored(EventWith(writeSeq: 7));
        _currentUser.Setup(u => u.GetUserId()).Returns("user-a");

        var tags = await TagsOverOneWindowAsync();

        Assert.Equal(2, tags.Distinct().Count());
    }

    [Fact]
    public async Task HandleAsync_ViewersDoNotAllRollOverAtTheSameSecond()
    {
        Stored(EventWith(writeSeq: 7));
        var rolloverSeconds = new HashSet<int>();

        foreach (var user in Enumerable.Range(0, 10).Select(i => $"user-{i}"))
        {
            _currentUser.Setup(u => u.GetUserId()).Returns(user);
            var tags = await TagsOverOneWindowAsync();
            rolloverSeconds.Add(Enumerable.Range(1, tags.Count - 1).First(second => tags[second] != tags[second - 1]));
        }

        Assert.True(rolloverSeconds.Count > 1);
    }

    private async Task<List<string?>> TagsOverOneWindowAsync()
    {
        var tags = new List<string?>();
        for (var second = 0; second <= EventViewTagHandler.FreshnessWindow.TotalSeconds; second++)
            tags.Add(await Handler(Noon.AddSeconds(second)).HandleAsync("soiree"));
        return tags;
    }

    [Fact]
    public async Task HandleAsync_ChangesWhenTheWriteSequenceMoves()
    {
        Stored(EventWith(writeSeq: 7));
        var before = await Handler(Noon).HandleAsync("soiree");

        Stored(EventWith(writeSeq: 8));
        var after = await Handler(Noon).HandleAsync("soiree");

        Assert.NotEqual(before, after);
    }

    [Fact]
    public async Task HandleAsync_ChangesWhenTheVersionMoves()
    {
        Stored(EventWith(writeSeq: 7, version: 3));
        var before = await Handler(Noon).HandleAsync("soiree");

        Stored(EventWith(writeSeq: 7, version: 4));
        var after = await Handler(Noon).HandleAsync("soiree");

        Assert.NotEqual(before, after);
    }

    [Fact]
    public async Task HandleAsync_ChangesOncePerFreshnessWindow()
    {
        Stored(EventWith(writeSeq: 7));

        var first = await Handler(Noon).HandleAsync("soiree");
        var nextMinute = await Handler(Noon.Add(EventViewTagHandler.FreshnessWindow)).HandleAsync("soiree");

        Assert.NotEqual(first, nextMinute);
    }

    [Fact]
    public async Task HandleAsync_DiffersBetweenTwoSignedInUsers()
    {
        Stored(EventWith(writeSeq: 7));

        _currentUser.Setup(u => u.GetUserId()).Returns("user-a");
        var forA = await Handler(Noon).HandleAsync("soiree");
        _currentUser.Setup(u => u.GetUserId()).Returns("user-b");
        var forB = await Handler(Noon).HandleAsync("soiree");

        Assert.NotEqual(forA, forB);
    }

    [Fact]
    public async Task HandleAsync_DiffersBetweenAGuestAndTheHostByToken()
    {
        Stored(EventWith(writeSeq: 7));

        var asGuest = await Handler(Noon).HandleAsync("soiree");
        _hostToken.Setup(h => h.GetHostToken()).Returns("host-token");
        var asHost = await Handler(Noon).HandleAsync("soiree");

        Assert.NotEqual(asGuest, asHost);
    }

    [Fact]
    public async Task HandleAsync_DoesNotEmbedTheUserIdNorTheHostToken()
    {
        Stored(EventWith(writeSeq: 7));
        _currentUser.Setup(u => u.GetUserId()).Returns("user-a");
        _hostToken.Setup(h => h.GetHostToken()).Returns("host-token");

        var tag = await Handler(Noon).HandleAsync("soiree");

        Assert.DoesNotContain("user-a", tag);
        Assert.DoesNotContain("host-token", tag);
    }
}

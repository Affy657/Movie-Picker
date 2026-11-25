using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class HostedEventTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IHostTokenAccessor> _hostTokens = new();

    private Event Stored(Event evt)
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        return evt;
    }

    [Fact]
    public async Task LoadForHostAsync_ANonHostOnAFinishedEvent_IsRefusedAsHostOnly()
    {
        Stored(new EventEntityBuilder().WithSlug("soiree").Closed().Build());
        _hostTokens.Setup(h => h.GetHostToken()).Returns("wrong");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => HostedEvent.LoadForHostAsync(
            _events.Object, _hostTokens.Object, "someone", "soiree", DateTimeOffset.UtcNow, CancellationToken.None));

        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Fact]
    public async Task LoadForHostAsync_TheHostOnAFinishedEvent_IsRefusedAsEventFinished()
    {
        Stored(new EventEntityBuilder().WithSlug("soiree").Closed().Build());
        _hostTokens.Setup(h => h.GetHostToken()).Returns("host-token");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => HostedEvent.LoadForHostAsync(
            _events.Object, _hostTokens.Object, null, "soiree", DateTimeOffset.UtcNow, CancellationToken.None));

        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
    }

    [Fact]
    public async Task LoadForHostEvenFinishedAsync_LetsTheCreatorAccountThroughOnAFinishedEvent()
    {
        var evt = Stored(new EventEntityBuilder().WithSlug("soiree").Closed().Build() with { CreatorUserId = "creator" });

        var loaded = await HostedEvent.LoadForHostEvenFinishedAsync(
            _events.Object, _hostTokens.Object, "creator", "soiree", CancellationToken.None);

        Assert.Same(evt, loaded);
    }

    [Fact]
    public async Task LoadForHostEvenFinishedAsync_StillRefusesANonHost()
    {
        Stored(new EventEntityBuilder().WithSlug("soiree").Build() with { CreatorUserId = "creator" });

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => HostedEvent.LoadForHostEvenFinishedAsync(
            _events.Object, _hostTokens.Object, "someone-else", "soiree", CancellationToken.None));

        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Theory]
    [InlineData("creator", true)]
    [InlineData("co-host", true)]
    [InlineData("guest", false)]
    [InlineData(null, false)]
    public void IsHostAccount_ChecksTheSignedInAccountWithoutAnyHostLink(string? userId, bool expected)
    {
        var evt = new Event { HostToken = "host-token", CreatorUserId = "creator", CoHostUserIds = ["co-host"] };

        Assert.Equal(expected, HostedEvent.IsHostAccount(evt, userId));
    }
}

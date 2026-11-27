using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.Sessions;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.Sessions;

internal static class SessionFixtures
{
    public const string UserId = "u1";
    public const string CurrentKey = "key-current";
    public static readonly DateTimeOffset Now = new(2026, 11, 27, 12, 0, 0, TimeSpan.Zero);

    public const string WindowsChrome =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    public const string IphoneSafari =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

    public static StoredAuthSession Session(string key, string? userAgent, int createdDaysAgo, double? lastSeenHoursAgo) =>
        new(
            key,
            userAgent,
            Now.AddDays(-createdDaysAgo),
            lastSeenHoursAgo is { } hours ? Now.AddHours(-hours) : null);

    public static Mock<IAuthSessionDirectory> Directory(params StoredAuthSession[] sessions)
    {
        var directory = new Mock<IAuthSessionDirectory>();
        directory.Setup(d => d.ListActiveForUserAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(sessions);
        return directory;
    }
}

public sealed class ListActiveSessionsHandlerTests
{
    [Fact]
    public async Task HandleAsync_DescribesEachDeviceFromItsUserAgent()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0),
            SessionFixtures.Session("key-phone", SessionFixtures.IphoneSafari, 20, 2));

        var result = await new ListActiveSessionsHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey);

        var phone = Assert.Single(result.Items, s => !s.Current);
        Assert.Equal("Safari", phone.Browser);
        Assert.Equal("iOS", phone.OperatingSystem);
        Assert.Equal(DeviceKind.Phone, phone.DeviceKind);
        Assert.Equal(SessionFixtures.Now.AddDays(-20), phone.SignedInAt);
        Assert.Equal(SessionFixtures.Now.AddHours(-2), phone.LastActiveAt);
    }

    [Fact]
    public async Task HandleAsync_PutsTheCurrentSessionFirstThenTheMostRecentlyActive()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session("key-old", SessionFixtures.IphoneSafari, 40, 140),
            SessionFixtures.Session("key-legacy", null, 60, null),
            SessionFixtures.Session("key-recent", SessionFixtures.IphoneSafari, 30, 2),
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0));

        var result = await new ListActiveSessionsHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey);

        Assert.True(result.Items[0].Current);
        Assert.All(result.Items.Skip(1), s => Assert.False(s.Current));
        Assert.Equal(
            [SessionFixtures.Now.AddHours(-2), SessionFixtures.Now.AddHours(-140), null],
            result.Items.Skip(1).Select(s => s.LastActiveAt));
    }

    [Fact]
    public async Task HandleAsync_SessionOpenedBeforeDevicesWereRecorded_IsAnUnknownDevice()
    {
        var directory = SessionFixtures.Directory(SessionFixtures.Session("key-legacy", null, 60, null));

        var result = await new ListActiveSessionsHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey);

        var legacy = Assert.Single(result.Items);
        Assert.Null(legacy.Browser);
        Assert.Null(legacy.OperatingSystem);
        Assert.Equal(DeviceKind.Unknown, legacy.DeviceKind);
        Assert.Null(legacy.LastActiveAt);
    }

    [Fact]
    public async Task HandleAsync_NeverExposesTheSessionKey()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0),
            SessionFixtures.Session("key-phone", SessionFixtures.IphoneSafari, 20, 2));

        var result = await new ListActiveSessionsHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey);

        Assert.All(result.Items, s => Assert.DoesNotContain("key", s.Id, StringComparison.Ordinal));
        Assert.Equal(2, result.Items.Select(s => s.Id).Distinct().Count());
        Assert.Equal(SessionPublicId.Of("key-phone"), result.Items[1].Id);
    }
}

public sealed class RevokeSessionHandlerTests
{
    [Fact]
    public async Task HandleAsync_RevokesTheSessionBehindThePublicId()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0),
            SessionFixtures.Session("key-phone", SessionFixtures.IphoneSafari, 20, 2));
        directory.Setup(d => d.RevokeForUserAsync(SessionFixtures.UserId, "key-phone", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await new RevokeSessionHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionPublicId.Of("key-phone"), SessionFixtures.CurrentKey);

        directory.Verify(d => d.RevokeForUserAsync(SessionFixtures.UserId, "key-phone", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnknownId_IsNotFound()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0));

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => new RevokeSessionHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionPublicId.Of("key-gone"), SessionFixtures.CurrentKey));

        Assert.Equal(ErrorCodes.SessionNotFound, ex.Reason);
        directory.Verify(d => d.RevokeForUserAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TheCurrentSession_IsNotRevokedHere()
    {
        var directory = SessionFixtures.Directory(
            SessionFixtures.Session(SessionFixtures.CurrentKey, SessionFixtures.WindowsChrome, 3, 0));

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => new RevokeSessionHandler(directory.Object)
            .HandleAsync(SessionFixtures.UserId, SessionPublicId.Of(SessionFixtures.CurrentKey), SessionFixtures.CurrentKey));

        Assert.Equal(ErrorCodes.SessionNotFound, ex.Reason);
        directory.Verify(d => d.RevokeForUserAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

public sealed class RevokeOtherSessionsHandlerTests
{
    [Fact]
    public async Task HandleAsync_KeepsOnlyTheCurrentSession()
    {
        var invalidator = new Mock<IAuthSessionInvalidator>();

        await new RevokeOtherSessionsHandler(invalidator.Object)
            .HandleAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey);

        invalidator.Verify(
            i => i.InvalidateOthersForUserAsync(SessionFixtures.UserId, SessionFixtures.CurrentKey, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithoutAKnownCurrentSession_RevokesNothing()
    {
        var invalidator = new Mock<IAuthSessionInvalidator>();

        await new RevokeOtherSessionsHandler(invalidator.Object).HandleAsync(SessionFixtures.UserId, null);

        invalidator.VerifyNoOtherCalls();
    }
}

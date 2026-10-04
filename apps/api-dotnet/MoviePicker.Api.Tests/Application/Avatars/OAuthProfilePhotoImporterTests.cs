using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.UseCases.EventTemplates;
using Xunit;

namespace MoviePicker.Api.Tests.Application.Avatars;

public sealed class OAuthProfilePhotoImporterTests
{
    private const string AccessToken = "ya29.token";

    private static readonly DateTimeOffset Now = new(2026, 10, 3, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryUserRepository _users = new();
    private readonly InMemoryAvatarPhotoRepository _photos = new();
    private readonly Mock<IGoogleProfilePhotoSource> _google = new();
    private readonly OAuthProfilePhotoImporter _sut;

    public OAuthProfilePhotoImporterTests()
    {
        var writer = new AvatarPhotoWriter(_users, _photos, new InMemoryUnitOfWork(), new FrozenClock(Now));
        _sut = new OAuthProfilePhotoImporter(_google.Object, writer, NullLogger<OAuthProfilePhotoImporter>.Instance);
    }

    private async Task<User> NewUserAsync() =>
        await _users.AddAsync(new User { Email = $"{Guid.NewGuid():N}@test.local", Handle = "new" + Guid.NewGuid().ToString("N")[..8] });

    private static ExternalLoginInfo Login(string provider = "google") =>
        new() { Provider = provider, Subject = "sub", Email = "new@test.local", EmailVerified = true, DisplayName = "New" };

    [Fact]
    public async Task Google_WithAPersonalPhoto_MakesItTheAvatar()
    {
        var user = await NewUserAsync();
        var jpeg = ImageHeaders.Jpeg(256, 256);
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ReturnsAsync(jpeg);

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.StartsWith(AvatarPhoto.AvatarIdPrefix, imported.DisplayedAvatarId);
        var stored = await _photos.GetByKeyAsync(imported.AvatarPhoto!.Key);
        Assert.Equal("image/jpeg", stored!.ContentType);
        Assert.Equal(jpeg, stored.Data);
    }

    [Fact]
    public async Task Google_WithoutAPersonalPhoto_KeepsTheInitials()
    {
        var user = await NewUserAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ReturnsAsync((byte[]?)null);

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.Null(imported.AvatarPhoto);
        Assert.Equal(string.Empty, imported.DisplayedAvatarId);
    }

    [Fact]
    public async Task Google_Unreachable_KeepsTheInitialsWithoutFailing()
    {
        var user = await NewUserAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ThrowsAsync(new HttpRequestException("down"));

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.Null(imported.AvatarPhoto);
    }

    [Fact]
    public async Task Google_FailingMidDownload_KeepsTheInitialsWithoutFailing()
    {
        var user = await NewUserAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ThrowsAsync(new IOException("reset"));

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.Null(imported.AvatarPhoto);
    }

    [Fact]
    public async Task Google_TooSlow_KeepsTheInitialsWithoutFailing()
    {
        var user = await NewUserAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ThrowsAsync(new OperationCanceledException());

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.Null(imported.AvatarPhoto);
    }

    [Fact]
    public async Task CallerCancellation_StillStopsTheSignIn()
    {
        var user = await NewUserAsync();
        using var cancelled = new CancellationTokenSource();
        await cancelled.CancelAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException(cancelled.Token));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.ImportAsync(user, Login(), AccessToken, cancelled.Token));
    }

    [Fact]
    public async Task Google_UnacceptableImage_KeepsTheInitials()
    {
        var user = await NewUserAsync();
        _google.Setup(g => g.FetchAsync(AccessToken, It.IsAny<CancellationToken>())).ReturnsAsync(ImageHeaders.Gif(256, 256));

        var imported = await _sut.ImportAsync(user, Login(), AccessToken);

        Assert.Null(imported.AvatarPhoto);
    }

    [Fact]
    public async Task GitHub_IsNeverAskedForAPhoto()
    {
        var user = await NewUserAsync();

        var imported = await _sut.ImportAsync(user, Login("github"), AccessToken);

        Assert.Null(imported.AvatarPhoto);
        _google.Verify(g => g.FetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Google_WithoutAccessToken_IsNotAskedForAPhoto()
    {
        var user = await NewUserAsync();

        var imported = await _sut.ImportAsync(user, Login(), accessToken: null);

        Assert.Null(imported.AvatarPhoto);
        _google.Verify(g => g.FetchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

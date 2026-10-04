using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.AvatarPhotos;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.UseCases.EventTemplates;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AvatarPhotos;

public sealed class AvatarPhotoHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 3, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryUserRepository _users = new();
    private readonly InMemoryAvatarPhotoRepository _photos = new();
    private readonly UploadAvatarPhotoHandler _upload;
    private readonly DeleteAvatarPhotoHandler _delete;
    private readonly PatchUserProfileHandler _patch;

    public AvatarPhotoHandlersTests()
    {
        var clock = new FrozenClock(Now);
        var writer = new AvatarPhotoWriter(_users, _photos, new InMemoryUnitOfWork(), clock);
        _upload = new UploadAvatarPhotoHandler(writer);
        _delete = new DeleteAvatarPhotoHandler(writer);
        _patch = new PatchUserProfileHandler(_users, clock);
    }

    private async Task<User> UserAsync(string avatarId = "bolt") =>
        await _users.AddAsync(new User
        {
            Email = $"{Guid.NewGuid():N}@test.local",
            DisplayName = "Léa",
            Handle = "lea" + Guid.NewGuid().ToString("N")[..8],
            AvatarId = avatarId,
            CreatedAt = Now,
            UpdatedAt = Now
        });

    private static UploadAvatarPhotoRequest Request(byte[] bytes, string contentType = "image/webp") =>
        new() { ContentType = contentType, Base64Content = Convert.ToBase64String(bytes) };

    private static byte[] Webp(int side = 256) => ImageHeaders.WebpLossy(side, side);

    private static string KeyOf(string avatarId) => avatarId[AvatarPhoto.AvatarIdPrefix.Length..];

    [Fact]
    public async Task Upload_ValidPhoto_BecomesTheDisplayedAvatar()
    {
        var user = await UserAsync();

        var profile = await _upload.HandleAsync(user.Id, Request(Webp()));

        Assert.StartsWith(AvatarPhoto.AvatarIdPrefix, profile.AvatarId);
        Assert.Equal(profile.AvatarId, profile.AvatarPhotoId);
        var stored = await _photos.GetByKeyAsync(KeyOf(profile.AvatarId));
        Assert.NotNull(stored);
        Assert.Equal("image/webp", stored!.ContentType);
        Assert.Equal(user.Id, stored.UserId);
        Assert.Equal(Webp(), stored.Data);
    }

    [Fact]
    public async Task Upload_KeepsTheGeneratedAvatarToFallBackOn()
    {
        var user = await UserAsync("bolt");

        var profile = await _upload.HandleAsync(user.Id, Request(Webp()));

        Assert.Equal("bolt", profile.GeneratedAvatarId);
        Assert.Equal("bolt", (await _users.GetByIdAsync(user.Id))!.AvatarId);
    }

    [Fact]
    public async Task Upload_ReplacingThePhoto_DeletesThePreviousOne()
    {
        var user = await UserAsync();
        var first = await _upload.HandleAsync(user.Id, Request(Webp()));

        var second = await _upload.HandleAsync(user.Id, Request(ImageHeaders.Png(300, 300), "image/png"));

        Assert.NotEqual(first.AvatarId, second.AvatarId);
        Assert.Null(await _photos.GetByKeyAsync(KeyOf(first.AvatarId)));
        Assert.NotNull(await _photos.GetByKeyAsync(KeyOf(second.AvatarId)));
    }

    public static TheoryData<byte[], string> RejectedUploads() => new()
    {
        { ImageHeaders.Gif(256, 256), "image/png" },
        { ImageHeaders.Svg(), "image/png" },
        { ImageHeaders.WebpExtended(256, 256, animated: true), "image/webp" },
        { ImageHeaders.Png(100, 400), "image/png" },
        { ImageHeaders.Png(256, 2000), "image/png" },
        { ImageHeaders.Png(256, 256), "image/webp" },
        { [.. ImageHeaders.Png(256, 256), .. new byte[AvatarPhotoImage.MaxBytes]], "image/png" }
    };

    [Theory]
    [MemberData(nameof(RejectedUploads))]
    public async Task Upload_UnacceptableImage_IsRejectedAndChangesNothing(byte[] bytes, string contentType)
    {
        var user = await UserAsync("bolt");

        var ex = await Assert.ThrowsAsync<BadRequestException>(
            () => _upload.HandleAsync(user.Id, Request(bytes, contentType)));

        Assert.Equal(ErrorCodes.AvatarPhotoInvalid, ex.Reason);
        var unchanged = await _users.GetByIdAsync(user.Id);
        Assert.Null(unchanged!.AvatarPhoto);
        Assert.Equal("bolt", unchanged.DisplayedAvatarId);
    }

    [Fact]
    public async Task Upload_MalformedBase64_IsRejected()
    {
        var user = await UserAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _upload.HandleAsync(
            user.Id, new UploadAvatarPhotoRequest { ContentType = "image/webp", Base64Content = "not base64 !" }));

        Assert.Equal(ErrorCodes.AvatarPhotoInvalid, ex.Reason);
    }

    [Fact]
    public async Task Upload_UnknownUser_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _upload.HandleAsync("missing", Request(Webp())));

        Assert.Equal(ErrorCodes.UserNotFound, ex.Reason);
        Assert.Equal(0, await _photos.DeleteByUserIdAsync("missing"));
    }

    [Fact]
    public async Task Delete_UnknownUser_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _delete.HandleAsync("missing"));

        Assert.Equal(ErrorCodes.UserNotFound, ex.Reason);
    }

    [Fact]
    public async Task Delete_ActivePhoto_FallsBackToThePreviousGeneratedAvatar()
    {
        var user = await UserAsync("bolt");
        var uploaded = await _upload.HandleAsync(user.Id, Request(Webp()));

        var profile = await _delete.HandleAsync(user.Id);

        Assert.Equal("bolt", profile.AvatarId);
        Assert.Null(profile.AvatarPhotoId);
        Assert.Null(await _photos.GetByKeyAsync(KeyOf(uploaded.AvatarId)));
    }

    [Fact]
    public async Task Delete_ActivePhotoWithoutGeneratedAvatar_FallsBackToInitials()
    {
        var user = await UserAsync(avatarId: string.Empty);
        await _upload.HandleAsync(user.Id, Request(Webp()));

        var profile = await _delete.HandleAsync(user.Id);

        Assert.Equal(string.Empty, profile.AvatarId);
    }

    [Fact]
    public async Task Delete_KeptInactivePhoto_KeepsTheGeneratedAvatar()
    {
        var user = await UserAsync("bolt");
        await _upload.HandleAsync(user.Id, Request(Webp()));
        await _patch.HandleAsync(user.Id, new PatchUserProfileRequest { AvatarId = "cute" });

        var profile = await _delete.HandleAsync(user.Id);

        Assert.Equal("cute", profile.AvatarId);
        Assert.Null(profile.AvatarPhotoId);
    }

    [Fact]
    public async Task Delete_WithoutPhoto_ChangesNothing()
    {
        var user = await UserAsync("bolt");

        var profile = await _delete.HandleAsync(user.Id);

        Assert.Equal("bolt", profile.AvatarId);
        Assert.Null(profile.AvatarPhotoId);
    }

    [Fact]
    public async Task PatchGeneratedAvatar_KeepsThePhotoAvailableButDisplaysTheGeneratedOne()
    {
        var user = await UserAsync("bolt");
        var uploaded = await _upload.HandleAsync(user.Id, Request(Webp()));

        var profile = await _patch.HandleAsync(user.Id, new PatchUserProfileRequest { AvatarId = "cute" });

        Assert.Equal("cute", profile.AvatarId);
        Assert.Equal(uploaded.AvatarPhotoId, profile.AvatarPhotoId);
        Assert.NotNull(await _photos.GetByKeyAsync(KeyOf(uploaded.AvatarId)));
    }

    [Fact]
    public async Task PatchUseAvatarPhoto_DisplaysTheKeptPhotoAgain()
    {
        var user = await UserAsync("bolt");
        var uploaded = await _upload.HandleAsync(user.Id, Request(Webp()));
        await _patch.HandleAsync(user.Id, new PatchUserProfileRequest { AvatarId = "cute" });

        var profile = await _patch.HandleAsync(user.Id, new PatchUserProfileRequest { UseAvatarPhoto = true });

        Assert.Equal(uploaded.AvatarId, profile.AvatarId);
        Assert.Equal("cute", (await _users.GetByIdAsync(user.Id))!.AvatarId);
    }

    [Fact]
    public async Task PatchUseAvatarPhoto_WithoutPhoto_IsRejected()
    {
        var user = await UserAsync("bolt");

        var ex = await Assert.ThrowsAsync<NotFoundException>(
            () => _patch.HandleAsync(user.Id, new PatchUserProfileRequest { UseAvatarPhoto = true }));

        Assert.Equal(ErrorCodes.AvatarPhotoNotFound, ex.Reason);
    }
}

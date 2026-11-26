using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Banners;

public sealed class ProfileBannerWriter
{
    public const string StorageFullLogTemplate = "Banner photo refused: {Stored} photos stored for a limit of {Limit}";

    private readonly IUserRepository _users;
    private readonly IBannerPhotoRepository _photos;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<ProfileBannerWriter> _logger;

    public ProfileBannerWriter(
        IUserRepository users,
        IBannerPhotoRepository photos,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        IOptions<MoviePickerOptions> options,
        ILogger<ProfileBannerWriter> logger)
    {
        _users = users;
        _photos = photos;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options.Value;
        _logger = logger;
    }

    public Task<User> UseFilmAsync(string userId, int tmdbId, string title, string imagePath, CancellationToken ct = default) =>
        UpdateAsync(userId, (current, now) => current with { Banner = ProfileBanner.FromFilm(tmdbId, title, imagePath, now) }, ct);

    public Task<User> UsePhotoAsync(string userId, CancellationToken ct = default) =>
        UpdateAsync(
            userId,
            (current, now) => current.BannerPhoto is null
                ? throw Errors.BannerPhotoNotFound()
                : current with { Banner = ProfileBanner.FromPhoto(now) },
            ct);

    public Task<User> RemoveAsync(string userId, CancellationToken ct = default) =>
        UpdateAsync(userId, (current, _) => current.Banner is null ? current : current with { Banner = null }, ct);

    public async Task<User> ReplacePhotoAsync(string userId, byte[] bytes, AvatarPhotoFormat format, CancellationToken ct = default)
    {
        var cleaned = ImageMetadataStripper.Strip(bytes, format.ContentType) ?? throw Errors.BannerPhotoInvalid();
        await EnsureRoomForNewOwnerAsync(userId, ct);

        var now = _clock.GetUtcNow();
        var key = BannerPhoto.NewKey();
        User? saved = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _users.GetByIdAsync(userId, token) ?? throw Errors.UserNotFound();
                await _photos.SaveAsync(StoredPhoto.Create(key, userId, format.ContentType, cleaned, now), token);
                saved = await _users.UpdateAsync(
                    current with
                    {
                        BannerPhoto = new BannerPhoto { Key = key, UpdatedAt = now },
                        Banner = ProfileBanner.FromPhoto(now),
                        UpdatedAt = now
                    },
                    token);
                if (current.BannerPhoto is { } previous)
                    await _photos.ScheduleDeletionAsync(previous.Key, now + StoredPhoto.ReplacedPhotoLifetime, token);
            },
            ct);
        return saved!;
    }

    public async Task<User> DeletePhotoAsync(string userId, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        User? saved = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _users.GetByIdAsync(userId, token) ?? throw Errors.UserNotFound();
                if (current.BannerPhoto is not { } photo)
                {
                    saved = current;
                    return;
                }
                var banner = current.Banner is { Source: ProfileBannerSource.Photo } ? null : current.Banner;
                saved = await _users.UpdateAsync(current with { BannerPhoto = null, Banner = banner, UpdatedAt = now }, token);
                await _photos.DeleteAsync(photo.Key, token);
            },
            ct);
        return saved!;
    }

    private async Task<User> UpdateAsync(string userId, Func<User, DateTimeOffset, User> change, CancellationToken ct)
    {
        var now = _clock.GetUtcNow();
        User? saved = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _users.GetByIdAsync(userId, token) ?? throw Errors.UserNotFound();
                var next = change(current, now);
                saved = ReferenceEquals(next, current)
                    ? current
                    : await _users.UpdateAsync(next with { UpdatedAt = now }, token);
            },
            ct);
        return saved!;
    }

    private async Task EnsureRoomForNewOwnerAsync(string userId, CancellationToken ct)
    {
        var owner = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        if (owner.BannerPhoto is not null)
            return;

        var stored = await _photos.EstimatedCountAsync(ct);
        if (stored < _options.BannerPhotoMaxEntries)
            return;

        _logger.LogWarning(StorageFullLogTemplate, stored, _options.BannerPhotoMaxEntries);
        throw Errors.BannerPhotoStorageFull();
    }
}

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Avatars;

public sealed class AvatarPhotoWriter
{
    public const string StorageFullLogTemplate = "Avatar photo refused: {Stored} photos stored for a limit of {Limit}";

    private readonly IUserRepository _users;
    private readonly IAvatarPhotoRepository _photos;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<AvatarPhotoWriter> _logger;

    public AvatarPhotoWriter(
        IUserRepository users,
        IAvatarPhotoRepository photos,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        IOptions<MoviePickerOptions> options,
        ILogger<AvatarPhotoWriter> logger)
    {
        _users = users;
        _photos = photos;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<User> ReplaceAsync(string userId, byte[] bytes, AvatarPhotoFormat format, CancellationToken ct = default)
    {
        await EnsureRoomForNewOwnerAsync(userId, ct);

        var now = _clock.GetUtcNow();
        var key = AvatarPhoto.NewKey();
        User? saved = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _users.GetByIdAsync(userId, token) ?? throw Errors.UserNotFound();
                await _photos.SaveAsync(
                    new StoredAvatarPhoto
                    {
                        Key = key,
                        UserId = userId,
                        ContentType = format.ContentType,
                        Data = bytes,
                        CreatedAt = now
                    },
                    token);
                saved = await _users.UpdateAsync(
                    current with
                    {
                        AvatarPhoto = new AvatarPhoto { Key = key, IsActive = true, UpdatedAt = now },
                        UpdatedAt = now
                    },
                    token);
                if (current.AvatarPhoto is { } previous)
                    await _photos.DeleteAsync(previous.Key, token);
            },
            ct);
        return saved!;
    }

    private async Task EnsureRoomForNewOwnerAsync(string userId, CancellationToken ct)
    {
        var owner = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        if (owner.AvatarPhoto is not null)
            return;

        var stored = await _photos.EstimatedCountAsync(ct);
        if (stored < _options.AvatarPhotoMaxEntries)
            return;

        _logger.LogWarning(StorageFullLogTemplate, stored, _options.AvatarPhotoMaxEntries);
        throw Errors.AvatarPhotoStorageFull();
    }

    public async Task<User> RemoveAsync(string userId, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        User? saved = null;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _users.GetByIdAsync(userId, token) ?? throw Errors.UserNotFound();
                if (current.AvatarPhoto is not { } photo)
                {
                    saved = current;
                    return;
                }
                saved = await _users.UpdateAsync(current with { AvatarPhoto = null, UpdatedAt = now }, token);
                await _photos.DeleteAsync(photo.Key, token);
            },
            ct);
        return saved!;
    }
}

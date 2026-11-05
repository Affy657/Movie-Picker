using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Avatars;

public sealed class AvatarPhotoWriter
{
    private readonly IUserRepository _users;
    private readonly IAvatarPhotoRepository _photos;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public AvatarPhotoWriter(IUserRepository users, IAvatarPhotoRepository photos, IUnitOfWork unitOfWork, TimeProvider clock)
    {
        _users = users;
        _photos = photos;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<User> ReplaceAsync(string userId, byte[] bytes, AvatarPhotoFormat format, CancellationToken ct = default)
    {
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

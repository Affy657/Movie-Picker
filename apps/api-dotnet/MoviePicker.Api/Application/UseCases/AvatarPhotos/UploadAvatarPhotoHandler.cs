using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AvatarPhotos;

public sealed class UploadAvatarPhotoHandler : IUploadAvatarPhotoHandler
{
    private readonly AvatarPhotoWriter _writer;

    public UploadAvatarPhotoHandler(AvatarPhotoWriter writer) => _writer = writer;

    public async Task<UserProfileResponse> HandleAsync(
        string userId,
        UploadAvatarPhotoRequest request,
        CancellationToken ct = default)
    {
        var bytes = Decode(request.Base64Content);
        var format = AvatarPhotoImage.AcceptedFormatOf(bytes) ?? throw Errors.AvatarPhotoInvalid();
        if (!string.Equals(format.ContentType, request.ContentType, StringComparison.OrdinalIgnoreCase))
            throw Errors.AvatarPhotoInvalid();

        return UserProfileResponses.From(await _writer.ReplaceAsync(userId, bytes, format, ct));
    }

    private static byte[] Decode(string base64Content)
    {
        try
        {
            return Convert.FromBase64String(base64Content);
        }
        catch (FormatException)
        {
            throw Errors.AvatarPhotoInvalid();
        }
    }
}

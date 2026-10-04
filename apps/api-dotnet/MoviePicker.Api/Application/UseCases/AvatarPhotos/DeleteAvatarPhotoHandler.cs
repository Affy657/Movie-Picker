using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;

namespace MoviePicker.Api.Application.UseCases.AvatarPhotos;

public sealed class DeleteAvatarPhotoHandler : IDeleteAvatarPhotoHandler
{
    private readonly AvatarPhotoWriter _writer;

    public DeleteAvatarPhotoHandler(AvatarPhotoWriter writer) => _writer = writer;

    public async Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default) =>
        UserProfileResponses.From(await _writer.RemoveAsync(userId, ct));
}

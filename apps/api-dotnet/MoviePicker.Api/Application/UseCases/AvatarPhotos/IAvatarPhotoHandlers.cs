using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.AvatarPhotos;

public interface IUploadAvatarPhotoHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, UploadAvatarPhotoRequest request, CancellationToken ct = default);
}

public interface IDeleteAvatarPhotoHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default);
}

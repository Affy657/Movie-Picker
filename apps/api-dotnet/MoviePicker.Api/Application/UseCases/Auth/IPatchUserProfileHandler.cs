using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IPatchUserProfileHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, PatchUserProfileRequest request, CancellationToken ct = default);
}

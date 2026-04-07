using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IGetUserProfileHandler
{
    Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default);
}

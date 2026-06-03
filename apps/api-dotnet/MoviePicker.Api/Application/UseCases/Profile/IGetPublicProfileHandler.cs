using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Profile;

public interface IGetPublicProfileHandler
{
    Task<PublicProfileResponse> HandleAsync(string handle, string? currentUserId = null, CancellationToken ct = default);
}

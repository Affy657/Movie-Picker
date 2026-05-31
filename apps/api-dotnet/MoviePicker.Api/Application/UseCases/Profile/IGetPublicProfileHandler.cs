using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Profile;

public interface IGetPublicProfileHandler
{
    Task<PublicProfileResponse> HandleAsync(string handle, CancellationToken ct = default);
}

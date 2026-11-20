using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Profile;

public interface ICheckHandleAvailabilityHandler
{
    Task<HandleAvailabilityResponse> HandleAsync(string userId, string handle, CancellationToken ct = default);
}

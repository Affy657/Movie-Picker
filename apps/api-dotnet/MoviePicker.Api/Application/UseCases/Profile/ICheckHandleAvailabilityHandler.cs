using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Profile;

public interface ICheckHandleAvailabilityHandler
{
    Task<HandleAvailabilityResponse> HandleAsync(string handle, string? currentUserId, CancellationToken ct = default);
}

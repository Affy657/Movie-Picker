using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class CheckHandleAvailabilityHandler : ICheckHandleAvailabilityHandler
{
    private readonly IUserRepository _users;

    public CheckHandleAvailabilityHandler(IUserRepository users) => _users = users;

    public async Task<HandleAvailabilityResponse> HandleAsync(
        string handle,
        string? currentUserId,
        CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var error = HandlePolicy.Validate(normalized);
        if (error is not null)
            return new HandleAvailabilityResponse { Handle = normalized, Available = false, Reason = error };

        var existing = await _users.GetByHandleAsync(normalized, ct);
        // The user's own current handle counts as available to them.
        var available = existing is null || existing.Id == currentUserId;

        return new HandleAvailabilityResponse
        {
            Handle = normalized,
            Available = available,
            Reason = available ? null : "Ce handle est déjà pris."
        };
    }
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class CheckHandleAvailabilityHandler : ICheckHandleAvailabilityHandler
{
    private readonly IUserRepository _users;

    public CheckHandleAvailabilityHandler(IUserRepository users)
    {
        _users = users;
    }

    public async Task<HandleAvailabilityResponse> HandleAsync(string userId, string handle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var refusal = HandlePolicy.Validate(normalized);
        if (refusal is not null)
            throw refusal;

        var holder = await _users.GetByHandleAsync(normalized, ct);
        return holder is null || holder.Id == userId
            ? new HandleAvailabilityResponse { Handle = normalized, Available = true }
            : new HandleAvailabilityResponse { Handle = normalized, Available = false, Reason = ErrorCodes.HandleTaken };
    }
}

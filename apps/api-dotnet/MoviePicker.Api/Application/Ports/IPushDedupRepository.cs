using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IPushDedupRepository
{
    Task<bool> TryClaimAsync(string userId, UserNotificationType type, string eventId, CancellationToken ct = default);
}

using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default);
    Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default);
    Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default);
    Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default);
    Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default);
}

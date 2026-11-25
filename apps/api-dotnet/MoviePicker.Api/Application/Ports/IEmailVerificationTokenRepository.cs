using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IEmailVerificationTokenRepository
{
    Task<EmailVerificationToken> AddAsync(EmailVerificationToken token, CancellationToken ct = default);
    Task<EmailVerificationToken?> FindUnexpiredAsync(string tokenHash, DateTimeOffset now, CancellationToken ct = default);
    Task<EmailVerificationToken?> GetLatestForUserAsync(string userId, CancellationToken ct = default);
    Task ConsumeAllForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default);
    Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default);
}

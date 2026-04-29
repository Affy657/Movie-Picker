using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class PasswordResetTokenDocumentMapper
{
    public static PasswordResetToken ToDomain(PasswordResetTokenDocument doc) =>
        new()
        {
            Id = doc.Id,
            UserId = doc.UserId,
            TokenHash = doc.TokenHash,
            ExpiresAtUtc = new DateTimeOffset(doc.ExpiresAtUtc, TimeSpan.Zero),
            ConsumedAt = doc.ConsumedAt is { } c ? new DateTimeOffset(c, TimeSpan.Zero) : null,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            RequestIp = doc.RequestIp,
            RequestUserAgent = doc.RequestUserAgent
        };

    public static PasswordResetTokenDocument ToDocument(PasswordResetToken token) =>
        new()
        {
            Id = token.Id,
            UserId = token.UserId,
            TokenHash = token.TokenHash,
            ExpiresAtUtc = token.ExpiresAtUtc.UtcDateTime,
            ConsumedAt = token.ConsumedAt?.UtcDateTime,
            CreatedAt = token.CreatedAt.UtcDateTime,
            RequestIp = token.RequestIp,
            RequestUserAgent = token.RequestUserAgent
        };
}

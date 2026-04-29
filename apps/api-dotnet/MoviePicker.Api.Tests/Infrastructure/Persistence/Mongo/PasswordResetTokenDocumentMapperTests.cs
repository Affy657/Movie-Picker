using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class PasswordResetTokenDocumentMapperTests
{
    private const string TokenId = "507f1f77bcf86cd799439011";
    private const string UserId = "507f191e810c19729de860ea";

    [Fact]
    public void ToDocument_ConvertsAllFields()
    {
        var token = new PasswordResetToken
        {
            Id = TokenId,
            UserId = UserId,
            TokenHash = "hashval",
            ExpiresAtUtc = new DateTimeOffset(2026, 2, 1, 14, 30, 0, TimeSpan.Zero),
            ConsumedAt = new DateTimeOffset(2026, 2, 1, 15, 0, 0, TimeSpan.Zero),
            CreatedAt = new DateTimeOffset(2026, 1, 31, 10, 0, 0, TimeSpan.Zero),
            RequestIp = "203.0.113.42",
            RequestUserAgent = "Mozilla/5.0 Test"
        };

        var doc = PasswordResetTokenDocumentMapper.ToDocument(token);

        Assert.Equal(TokenId, doc.Id);
        Assert.Equal(UserId, doc.UserId);
        Assert.Equal("hashval", doc.TokenHash);
        Assert.Equal(new DateTime(2026, 2, 1, 14, 30, 0, DateTimeKind.Utc), doc.ExpiresAtUtc);
        Assert.NotNull(doc.ConsumedAt);
        Assert.Equal(new DateTime(2026, 2, 1, 15, 0, 0, DateTimeKind.Utc), doc.ConsumedAt);
        Assert.Equal(new DateTime(2026, 1, 31, 10, 0, 0, DateTimeKind.Utc), doc.CreatedAt);
        Assert.Equal("203.0.113.42", doc.RequestIp);
        Assert.Equal("Mozilla/5.0 Test", doc.RequestUserAgent);
    }

    [Fact]
    public void ToDomain_ConvertsAllFields_AndPreservesUtc()
    {
        var doc = new PasswordResetTokenDocument
        {
            Id = TokenId,
            UserId = UserId,
            TokenHash = "abc123",
            ExpiresAtUtc = new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc),
            ConsumedAt = null,
            CreatedAt = new DateTime(2026, 3, 9, 20, 0, 0, DateTimeKind.Utc),
            RequestIp = null,
            RequestUserAgent = null
        };

        var domain = PasswordResetTokenDocumentMapper.ToDomain(doc);

        Assert.Equal(TokenId, domain.Id);
        Assert.Equal(UserId, domain.UserId);
        Assert.Equal("abc123", domain.TokenHash);
        Assert.Equal(TimeSpan.Zero, domain.ExpiresAtUtc.Offset);
        Assert.Equal(new DateTimeOffset(2026, 3, 10, 8, 0, 0, TimeSpan.Zero), domain.ExpiresAtUtc);
        Assert.Null(domain.ConsumedAt);
        Assert.Equal(TimeSpan.Zero, domain.CreatedAt.Offset);
        Assert.Equal(new DateTimeOffset(2026, 3, 9, 20, 0, 0, TimeSpan.Zero), domain.CreatedAt);
        Assert.Null(domain.RequestIp);
        Assert.Null(domain.RequestUserAgent);
    }

    [Fact]
    public void Roundtrip_PreservesValues_WithNullableNullsAndValues()
    {
        var withNulls = new PasswordResetToken
        {
            Id = TokenId,
            UserId = UserId,
            TokenHash = "h1",
            ExpiresAtUtc = new DateTimeOffset(2026, 4, 1, 12, 0, 0, TimeSpan.Zero),
            ConsumedAt = null,
            CreatedAt = new DateTimeOffset(2026, 3, 28, 9, 0, 0, TimeSpan.Zero),
            RequestIp = null,
            RequestUserAgent = null
        };
        AssertRoundtrip(withNulls);

        var withValues = new PasswordResetToken
        {
            Id = TokenId,
            UserId = UserId,
            TokenHash = "h2",
            ExpiresAtUtc = new DateTimeOffset(2026, 5, 1, 16, 45, 0, TimeSpan.Zero),
            ConsumedAt = new DateTimeOffset(2026, 5, 1, 17, 0, 0, TimeSpan.Zero),
            CreatedAt = new DateTimeOffset(2026, 4, 30, 8, 15, 0, TimeSpan.Zero),
            RequestIp = "198.51.100.10",
            RequestUserAgent = "CustomAgent/2"
        };
        AssertRoundtrip(withValues);
    }

    private static void AssertRoundtrip(PasswordResetToken original)
    {
        var doc = PasswordResetTokenDocumentMapper.ToDocument(original);
        var back = PasswordResetTokenDocumentMapper.ToDomain(doc);
        Assert.Equal(original.Id, back.Id);
        Assert.Equal(original.UserId, back.UserId);
        Assert.Equal(original.TokenHash, back.TokenHash);
        Assert.Equal(original.ExpiresAtUtc, back.ExpiresAtUtc);
        Assert.Equal(original.ConsumedAt, back.ConsumedAt);
        Assert.Equal(original.CreatedAt, back.CreatedAt);
        Assert.Equal(original.RequestIp, back.RequestIp);
        Assert.Equal(original.RequestUserAgent, back.RequestUserAgent);
    }
}

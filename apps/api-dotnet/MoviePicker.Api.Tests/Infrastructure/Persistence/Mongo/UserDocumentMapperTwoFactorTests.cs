using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperTwoFactorTests
{
    private static readonly DateTimeOffset EnabledAt = new(2026, 11, 27, 9, 0, 0, TimeSpan.Zero);

    private static User UserWith(TwoFactorSettings? twoFactor) =>
        new() { Id = "507f1f77bcf86cd799439011", Email = "test@example.com", TwoFactor = twoFactor };

    [Fact]
    public void ToDocument_WithoutTwoFactor_WritesNoTwoFactorElement()
    {
        var bson = UserDocumentMapper.ToDocument(UserWith(null)).ToBsonDocument();

        Assert.False(bson.Contains("twoFactor"));
    }

    [Fact]
    public void RoundTrip_TwoFactor_KeepsTheSecretTheLastStepAndTheBackupCodes()
    {
        var settings = new TwoFactorSettings
        {
            ProtectedSecret = "sealed-secret",
            EnabledAt = EnabledAt,
            LastUsedStep = 59_000_000,
            BackupCodeHashes = ["hash-1", "hash-2"]
        };

        var bson = UserDocumentMapper.ToDocument(UserWith(settings)).ToBsonDocument();
        var restored = UserDocumentMapper.ToDomain(BsonSerializer.Deserialize<UserDocument>(bson)).TwoFactor;

        Assert.NotNull(restored);
        Assert.Equal("sealed-secret", restored.ProtectedSecret);
        Assert.Equal(EnabledAt, restored.EnabledAt);
        Assert.Equal(59_000_000, restored.LastUsedStep);
        Assert.Equal(["hash-1", "hash-2"], restored.BackupCodeHashes);
        Assert.Equal("sealed-secret", bson["twoFactor"]["secret"].AsString);
    }
}

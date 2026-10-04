using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperAvatarPhotoTests
{
    private static readonly DateTimeOffset UpdatedAt = new(2026, 10, 3, 9, 0, 0, TimeSpan.Zero);

    private static User UserWith(AvatarPhoto? photo) =>
        new() { Id = "507f1f77bcf86cd799439011", Email = "test@example.com", AvatarId = "bolt", AvatarPhoto = photo };

    [Fact]
    public void ToDocument_WithoutPhoto_WritesNothing()
    {
        Assert.Null(UserDocumentMapper.ToDocument(UserWith(null)).AvatarPhoto);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void RoundTrip_KeepsTheKeyTheActiveFlagAndTheDate(bool isActive)
    {
        var photo = new AvatarPhoto { Key = AvatarPhotoKeys.Sample, IsActive = isActive, UpdatedAt = UpdatedAt };

        var restored = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(UserWith(photo)));

        Assert.Equal(photo, restored.AvatarPhoto);
        Assert.Equal("bolt", restored.AvatarId);
    }

    [Fact]
    public void ToDomain_DocumentWrittenBeforeTheFeature_HasNoPhoto()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith(null));

        Assert.Null(UserDocumentMapper.ToDomain(doc).AvatarPhoto);
    }

    [Fact]
    public void Read_APhotoCarryingAFieldFromALaterVersion_StillLoadsTheUser()
    {
        var stored = new BsonDocument
        {
            { "_id", ObjectId.Parse("507f1f77bcf86cd799439011") },
            { "email", "test@example.com" },
            {
                "avatarPhoto",
                new BsonDocument
                {
                    { "key", AvatarPhotoKeys.Sample },
                    { "isActive", true },
                    { "updatedAt", UpdatedAt.UtcDateTime },
                    { "moderation", "pending" }
                }
            }
        };

        var document = BsonSerializer.Deserialize<UserDocument>(stored);

        Assert.Equal(AvatarPhotoKeys.Sample, document.AvatarPhoto!.Key);
    }

    [Fact]
    public void Read_AStoredPhotoCarryingAFieldFromALaterVersion_StillLoads()
    {
        var stored = new BsonDocument
        {
            { "_id", AvatarPhotoKeys.Sample },
            { "userId", "507f1f77bcf86cd799439011" },
            { "contentType", "image/webp" },
            { "data", new BsonBinaryData([0x52]) },
            { "createdAt", UpdatedAt.UtcDateTime },
            { "moderation", "pending" }
        };

        var document = BsonSerializer.Deserialize<AvatarPhotoBlobDocument>(stored);

        Assert.Equal("image/webp", document.ContentType);
    }
}

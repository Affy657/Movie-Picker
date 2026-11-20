using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperBannerTests
{
    private static readonly DateTimeOffset UpdatedAt = new(2026, 11, 20, 9, 0, 0, TimeSpan.Zero);

    private static User UserWith(ProfileBanner? banner, BannerPhoto? photo = null) =>
        new() { Id = "507f1f77bcf86cd799439011", Email = "test@example.com", AvatarId = "bolt", Banner = banner, BannerPhoto = photo };

    [Fact]
    public void ToDocument_WithoutBanner_WritesNothing()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith(null));

        Assert.Null(doc.Banner);
        Assert.Null(doc.BannerPhoto);
    }

    [Fact]
    public void RoundTrip_FilmBanner_KeepsTheFilmTitleImageAndDate()
    {
        var banner = ProfileBanner.FromFilm(693134, "Dune : Deuxième partie", "/sunset.jpg", UpdatedAt);

        var restored = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(UserWith(banner)));

        Assert.Equal(banner, restored.Banner);
    }

    [Fact]
    public void RoundTrip_PhotoBanner_KeepsTheSourceAndThePhoto()
    {
        var photo = new BannerPhoto { Key = AvatarPhotoKeys.Sample, UpdatedAt = UpdatedAt };

        var restored = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(UserWith(ProfileBanner.FromPhoto(UpdatedAt), photo)));

        Assert.Equal(ProfileBanner.FromPhoto(UpdatedAt), restored.Banner);
        Assert.Equal(photo, restored.BannerPhoto);
    }

    [Fact]
    public void RoundTrip_KeptPhotoBehindAFilmBanner_KeepsBoth()
    {
        var banner = ProfileBanner.FromFilm(693134, "Dune", "/sunset.jpg", UpdatedAt);
        var photo = new BannerPhoto { Key = AvatarPhotoKeys.Sample, UpdatedAt = UpdatedAt };

        var restored = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(UserWith(banner, photo)));

        Assert.Equal(banner, restored.Banner);
        Assert.Equal(photo, restored.BannerPhoto);
    }

    [Fact]
    public void Read_DocumentWrittenBeforeTheFeature_HasNoBanner()
    {
        var stored = new BsonDocument
        {
            { "_id", ObjectId.Parse("507f1f77bcf86cd799439011") },
            { "email", "test@example.com" }
        };

        var user = UserDocumentMapper.ToDomain(BsonSerializer.Deserialize<UserDocument>(stored));

        Assert.Null(user.Banner);
        Assert.Null(user.BannerPhoto);
    }

    [Fact]
    public void Read_ABannerFromALaterVersion_StillLoadsTheUserWithoutIt()
    {
        var stored = new BsonDocument
        {
            { "_id", ObjectId.Parse("507f1f77bcf86cd799439011") },
            { "email", "test@example.com" },
            { "banner", new BsonDocument { { "source", "video" }, { "updatedAt", UpdatedAt.UtcDateTime }, { "loop", true } } }
        };

        var user = UserDocumentMapper.ToDomain(BsonSerializer.Deserialize<UserDocument>(stored));

        Assert.Null(user.Banner);
    }
}

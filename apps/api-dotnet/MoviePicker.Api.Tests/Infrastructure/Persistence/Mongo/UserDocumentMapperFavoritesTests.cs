using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperFavoritesTests
{
    private static User UserWith(params FavoriteTitle[] favorites) =>
        new()
        {
            Id = "507f1f77bcf86cd799439011",
            Email = "test@example.com",
            Favorites = favorites
        };

    private static readonly FavoriteTitle Heat = new()
    {
        TmdbId = 949,
        MediaType = MovieMediaType.Movie,
        Title = "Heat",
        Year = "1995",
        PosterPath = "/api/v1/posters/" + new string('a', 64)
    };

    private static readonly FavoriteTitle TwinPeaks = new()
    {
        TmdbId = 1920,
        MediaType = MovieMediaType.Tv,
        Title = "Twin Peaks",
        Year = "1990",
        PosterPath = null
    };

    [Fact]
    public void ToDocument_NoFavorites_WritesNothing()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith());

        Assert.Null(doc.Favorites);
    }

    [Fact]
    public void ToDomain_AccountFromBeforeFavorites_ReadsEmptyList()
    {
        var back = UserDocumentMapper.ToDomain(new UserDocument { Id = "507f1f77bcf86cd799439011" });

        Assert.Empty(back.Favorites);
    }

    [Fact]
    public void ToDocument_WritesTheMediaTypeAsText()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith(Heat, TwinPeaks));

        Assert.NotNull(doc.Favorites);
        Assert.Equal(["movie", "tv"], doc.Favorites.Select(f => f.MediaType));
    }

    [Fact]
    public void RoundTrip_KeepsTheOrderAndEveryField()
    {
        var back = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(UserWith(TwinPeaks, Heat)));

        Assert.Equal([TwinPeaks, Heat], back.Favorites);
    }
}

using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class UserAvatarTests
{
    private static readonly string PhotoKey = AvatarPhotoKeys.Sample;

    [Fact]
    public void DisplayedAvatarId_WithoutPhoto_IsTheGeneratedAvatar()
    {
        var user = new User { AvatarId = "bolt" };

        Assert.Equal("bolt", user.DisplayedAvatarId);
    }

    [Fact]
    public void DisplayedAvatarId_WithoutPhotoOrGeneratedAvatar_IsEmpty()
    {
        Assert.Equal(string.Empty, new User().DisplayedAvatarId);
    }

    [Fact]
    public void DisplayedAvatarId_WithActivePhoto_IsThePhoto()
    {
        var user = new User { AvatarId = "bolt", AvatarPhoto = new AvatarPhoto { Key = PhotoKey, IsActive = true } };

        Assert.Equal($"photo:{PhotoKey}", user.DisplayedAvatarId);
    }

    [Fact]
    public void DisplayedAvatarId_WithKeptInactivePhoto_IsTheGeneratedAvatar()
    {
        var user = new User { AvatarId = "bolt", AvatarPhoto = new AvatarPhoto { Key = PhotoKey, IsActive = false } };

        Assert.Equal("bolt", user.DisplayedAvatarId);
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef", true)]
    [InlineData("0123456789ABCDEF0123456789ABCDEF", false)]
    [InlineData("0123456789abcdef", false)]
    [InlineData("../../etc/passwd", false)]
    [InlineData("", false)]
    public void IsValidKey_AcceptsOnlyLowercaseHexOfTheGeneratedLength(string key, bool valid)
    {
        Assert.Equal(valid, AvatarPhoto.IsValidKey(key));
    }

    [Fact]
    public void NewKey_IsAValidKeyAndDiffersEachTime()
    {
        var first = AvatarPhoto.NewKey();
        var second = AvatarPhoto.NewKey();

        Assert.True(AvatarPhoto.IsValidKey(first));
        Assert.NotEqual(first, second);
    }
}

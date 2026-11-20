using MoviePicker.Api.Application.Banners;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Application.Banners;

public sealed class BannerPhotoImageTests
{
    [Theory]
    [InlineData(1600, 900)]
    [InlineData(1280, 720)]
    [InlineData(1920, 1080)]
    [InlineData(1366, 768)]
    public void Landscape16By9_InTheAcceptedWidths_IsAccepted(int width, int height)
    {
        var format = BannerPhotoImage.AcceptedFormatOf(ImageHeaders.Jpeg(width, height));

        Assert.NotNull(format);
        Assert.Equal("image/jpeg", format!.ContentType);
        Assert.Equal(width, format.Width);
    }

    [Theory]
    [InlineData(1279, 719)]
    [InlineData(1921, 1081)]
    [InlineData(1600, 1200)]
    [InlineData(900, 1600)]
    [InlineData(1600, 400)]
    public void OtherSizesOrShapes_AreRefused(int width, int height)
    {
        Assert.Null(BannerPhotoImage.AcceptedFormatOf(ImageHeaders.Jpeg(width, height)));
    }

    [Fact]
    public void WebpAndPng_AreAccepted()
    {
        Assert.Equal("image/webp", BannerPhotoImage.AcceptedFormatOf(ImageHeaders.WebpLossy(1600, 900))?.ContentType);
        Assert.Equal("image/png", BannerPhotoImage.AcceptedFormatOf(ImageHeaders.Png(1600, 900))?.ContentType);
    }

    [Fact]
    public void AnimatedImage_IsRefused()
    {
        Assert.Null(BannerPhotoImage.AcceptedFormatOf(ImageHeaders.Png(1600, 900, animated: true)));
    }

    [Fact]
    public void ImageHeavierThanTheLimit_IsRefused()
    {
        var header = ImageHeaders.Jpeg(1600, 900);
        var heavy = new byte[BannerPhotoImage.MaxBytes + 1];
        header.CopyTo(heavy, 0);

        Assert.Null(BannerPhotoImage.AcceptedFormatOf(heavy));
    }

    [Fact]
    public void Base64OfTheHeaviestImage_FitsUnderTheDefaultRequestBodyLimit()
    {
        Assert.True(BannerPhotoImage.MaxBase64Length < 1_000_000);
    }

    [Fact]
    public void NotAnImage_IsRefused()
    {
        Assert.Null(BannerPhotoImage.AcceptedFormatOf([1, 2, 3, 4]));
        Assert.Null(BannerPhotoImage.AcceptedFormatOf([]));
    }
}

using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Application.Avatars;

public sealed class AvatarPhotoImageTests
{
    [Fact]
    public void Inspect_Png_ReadsTheDimensionsFromTheHeader()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.Png(256, 300));

        Assert.Equal(new AvatarPhotoFormat("image/png", 256, 300), format);
    }

    [Fact]
    public void Inspect_Jpeg_ReadsTheDimensionsFromTheBaselineFrame()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.Jpeg(640, 480));

        Assert.Equal(new AvatarPhotoFormat("image/jpeg", 640, 480), format);
    }

    [Fact]
    public void Inspect_Jpeg_ReadsTheDimensionsFromAProgressiveFrame()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.Jpeg(512, 512, startOfFrameMarker: 0xC2));

        Assert.Equal(new AvatarPhotoFormat("image/jpeg", 512, 512), format);
    }

    [Fact]
    public void Inspect_JpegWithoutAFrame_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.JpegWithoutFrame()));
    }

    [Fact]
    public void Inspect_LossyWebp_ReadsTheDimensions()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.WebpLossy(256, 256));

        Assert.Equal(new AvatarPhotoFormat("image/webp", 256, 256), format);
    }

    [Fact]
    public void Inspect_LosslessWebp_ReadsTheDimensions()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.WebpLossless(300, 200));

        Assert.Equal(new AvatarPhotoFormat("image/webp", 300, 200), format);
    }

    [Fact]
    public void Inspect_ExtendedWebp_ReadsTheCanvasDimensions()
    {
        var format = AvatarPhotoImage.Inspect(ImageHeaders.WebpExtended(1000, 700));

        Assert.Equal(new AvatarPhotoFormat("image/webp", 1000, 700), format);
    }

    [Fact]
    public void Inspect_AnimatedWebp_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.WebpExtended(256, 256, animated: true)));
    }

    [Fact]
    public void Inspect_AnimatedPng_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.Png(256, 256, animated: true)));
    }

    [Fact]
    public void Inspect_Gif_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.Gif(256, 256)));
    }

    [Fact]
    public void Inspect_Svg_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.Svg()));
    }

    [Fact]
    public void Inspect_TruncatedPng_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect(ImageHeaders.Png(256, 256)[..12]));
    }

    [Fact]
    public void Inspect_Empty_IsRejected()
    {
        Assert.Null(AvatarPhotoImage.Inspect([]));
    }

    [Theory]
    [InlineData(128, 128, true)]
    [InlineData(1024, 1024, true)]
    [InlineData(127, 256, false)]
    [InlineData(256, 127, false)]
    [InlineData(1025, 256, false)]
    [InlineData(256, 1025, false)]
    public void HasAcceptedSize_KeepsBothSidesBetweenTheBounds(int width, int height, bool accepted)
    {
        Assert.Equal(accepted, AvatarPhotoImage.HasAcceptedSize(new AvatarPhotoFormat("image/png", width, height)));
    }
}

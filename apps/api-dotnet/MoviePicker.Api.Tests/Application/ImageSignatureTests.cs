using MoviePicker.Api.Application;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class ImageSignatureTests
{
    public static TheoryData<byte[], string?> Samples => new()
    {
        { ImageHeaders.Png(256, 256), ImageSignature.Png },
        { ImageHeaders.Jpeg(256, 256), ImageSignature.Jpeg },
        { ImageHeaders.Gif(256, 256), ImageSignature.Gif },
        { ImageHeaders.WebpLossy(256, 256), ImageSignature.Webp },
        { ImageHeaders.Svg(), null },
        { [], null }
    };

    [Theory]
    [MemberData(nameof(Samples))]
    public void Detect_ReadsTheTypeFromTheFirstBytes(byte[] bytes, string? expected)
    {
        Assert.Equal(expected, ImageSignature.Detect(bytes));
    }
}

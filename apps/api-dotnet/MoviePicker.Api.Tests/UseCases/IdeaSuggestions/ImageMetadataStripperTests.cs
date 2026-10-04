using System.Buffers.Binary;
using System.Text;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.IdeaSuggestions;

public sealed class ImageMetadataStripperTests
{
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static byte[] Ascii(string value) => Encoding.ASCII.GetBytes(value);

    private static byte[] Concat(params byte[][] parts) => parts.SelectMany(p => p).ToArray();

    private static bool Contains(byte[] haystack, string needle) =>
        haystack.AsSpan().IndexOf(Ascii(needle)) >= 0;

    private static byte[] JpegSegment(byte marker, byte[] payload)
    {
        var length = new byte[2];
        BinaryPrimitives.WriteUInt16BigEndian(length, (ushort)(payload.Length + 2));
        return Concat([0xFF, marker], length, payload);
    }

    private static byte[] JpegScan(params byte[] entropyCodedData) =>
        Concat(JpegSegment(0xDA, [1, 1, 0, 0, 0x3F, 0]), entropyCodedData);

    private static byte[] ExifWithOrientation(ushort orientation)
    {
        var tiff = Concat(
            Ascii("II"), [0x2A, 0x00, 0x08, 0x00, 0x00, 0x00],
            [0x02, 0x00],
            [0x0F, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00],
            [0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, (byte)orientation, 0x00, 0x00, 0x00],
            [0x00, 0x00, 0x00, 0x00],
            Ascii("Canon\0"));
        return JpegSegment(0xE1, Concat(Ascii("Exif\0\0"), tiff));
    }

    private static byte[] PngChunk(string type, byte[] data)
    {
        var length = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(length, (uint)data.Length);
        return Concat(length, Ascii(type), data, [0, 0, 0, 0]);
    }

    private static byte[] WebpChunk(string fourCc, byte[] data)
    {
        var size = new byte[4];
        BinaryPrimitives.WriteUInt32LittleEndian(size, (uint)data.Length);
        var padding = data.Length % 2 == 1 ? new byte[] { 0 } : [];
        return Concat(Ascii(fourCc), size, data, padding);
    }

    private static byte[] Webp(params byte[][] chunks)
    {
        var body = Concat(Ascii("WEBP"), Concat(chunks));
        var size = new byte[4];
        BinaryPrimitives.WriteUInt32LittleEndian(size, (uint)body.Length);
        return Concat(Ascii("RIFF"), size, body);
    }

    private static readonly byte[] GifHeader = Concat(Ascii("GIF89a"), [1, 0, 1, 0, 0x80, 0, 0], [0, 0, 0, 255, 255, 255]);

    private static readonly byte[] GifLoop = Concat([0x21, 0xFF, 0x0B], Ascii("NETSCAPE2.0"), [0x03, 0x01, 0x00, 0x00, 0x00]);

    private static readonly byte[] GifFrame = Concat(
        [0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0x02, 0x02, 0x44, 0x01, 0x00]);

    [Fact]
    public void Jpeg_LosesItsExifXmpAndComments_ButKeepsTheImage()
    {
        var jfif = JpegSegment(0xE0, Concat(Ascii("JFIF\0"), [1, 1, 0, 0, 1, 0, 1, 0, 0]));
        var exif = JpegSegment(0xE1, Concat(Ascii("Exif\0\0"), Ascii("GPS-SECRET")));
        var xmp = JpegSegment(0xE1, Ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>GPS-SECRET</x:xmpmeta>"));
        var comment = JpegSegment(0xFE, Ascii("taken at home"));
        var scan = Concat(JpegScan(0xAB, 0xCD, 0xFF, 0x00, 0xEF), [0xFF, 0xD9]);
        var original = Concat([0xFF, 0xD8], jfif, exif, xmp, comment, scan);

        var stripped = ImageMetadataStripper.Strip(original, "image/jpeg");

        Assert.NotNull(stripped);
        Assert.Equal(Concat([0xFF, 0xD8], jfif, scan), stripped);
        Assert.False(Contains(stripped, "GPS-SECRET"));
        Assert.False(Contains(stripped, "taken at home"));
    }

    [Fact]
    public void Jpeg_KeepsOnlyTheOrientationOfItsExif()
    {
        var scan = Concat(JpegScan(0x12, 0x34), [0xFF, 0xD9]);
        var original = Concat([0xFF, 0xD8], ExifWithOrientation(6), scan);

        var stripped = ImageMetadataStripper.Strip(original, "image/jpeg");

        var orientationOnly = Concat(
            [0xFF, 0xE1, 0x00, 0x22],
            Ascii("Exif\0\0"),
            Ascii("MM"), [0x00, 0x2A, 0x00, 0x00, 0x00, 0x08],
            [0x00, 0x01],
            [0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00],
            [0x00, 0x00, 0x00, 0x00]);
        Assert.Equal(Concat([0xFF, 0xD8], orientationOnly, scan), stripped);
        Assert.False(Contains(stripped!, "Canon"));
    }

    [Fact]
    public void Jpeg_WithTheDefaultOrientation_DropsTheExifEntirely()
    {
        var scan = Concat(JpegScan(0x12, 0x34), [0xFF, 0xD9]);

        var stripped = ImageMetadataStripper.Strip(Concat([0xFF, 0xD8], ExifWithOrientation(1), scan), "image/jpeg");

        Assert.Equal(Concat([0xFF, 0xD8], scan), stripped);
    }

    [Fact]
    public void Jpeg_LosesTheMetadataStoredBetweenTheScansOfAProgressiveImage()
    {
        var frame = JpegSegment(0xC2, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
        var firstScan = JpegScan(0x01, 0xFF, 0x00, 0x02, 0xFF, 0xD0, 0x03);
        var comment = JpegSegment(0xFE, Concat(Ascii("between scans"), [0xFF, 0xD9], Ascii("GPS-SECRET")));
        var table = JpegSegment(0xC4, [0x10, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x05]);
        var secondScan = JpegScan(0x04, 0x05);
        var original = Concat([0xFF, 0xD8], frame, firstScan, comment, table, secondScan, [0xFF, 0xD9], Ascii("TRAILER"));

        var stripped = ImageMetadataStripper.Strip(original, "image/jpeg");

        Assert.Equal(Concat([0xFF, 0xD8], frame, firstScan, table, secondScan, [0xFF, 0xD9]), stripped);
    }

    [Fact]
    public void Jpeg_LosesTheJfifThumbnail_ButKeepsTheJfifHeader()
    {
        var withThumbnail = JpegSegment(0xE0, Concat(Ascii("JFIF\0"), [1, 2, 1, 0, 72, 0, 72, 1, 1], [0xAA, 0xBB, 0xCC]));
        var extension = JpegSegment(0xE0, Concat(Ascii("JFXX\0"), [0x13], [0xAA, 0xBB, 0xCC]));
        var scan = Concat(JpegScan(0x12), [0xFF, 0xD9]);

        var stripped = ImageMetadataStripper.Strip(Concat([0xFF, 0xD8], withThumbnail, extension, scan), "image/jpeg");

        var header = JpegSegment(0xE0, Concat(Ascii("JFIF\0"), [1, 2, 1, 0, 72, 0, 72, 0, 0]));
        Assert.Equal(Concat([0xFF, 0xD8], header, scan), stripped);
    }

    [Fact]
    public void Jpeg_KeepsTheColourProfile_ButNotTheOtherApp2Segments()
    {
        var iccProfile = JpegSegment(0xE2, Concat(Ascii("ICC_PROFILE\0"), [1, 1, 9, 9]));
        var multiPicture = JpegSegment(0xE2, Concat(Ascii("MPF\0"), [1, 2, 3]));
        var adobe = JpegSegment(0xEE, Concat(Ascii("Adobe"), [0, 100, 0, 0, 0, 0, 1]));
        var scan = Concat(JpegScan(0x12), [0xFF, 0xD9]);

        var stripped = ImageMetadataStripper.Strip(Concat([0xFF, 0xD8], iccProfile, multiPicture, adobe, scan), "image/jpeg");

        Assert.Equal(Concat([0xFF, 0xD8], iccProfile, adobe, scan), stripped);
    }

    [Theory]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xE1, 0x10, 0x00, 0x45, 0x78 })]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x01, 0x45, 0x78 })]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xD8, 0x00, 0x04, 0x45, 0x78 })]
    [InlineData(new byte[] { 0xFF, 0xD8, 0x00, 0x00, 0x00, 0x00 })]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xFF, 0xFF })]
    public void Jpeg_ThatCannotBeWalked_IsRefused(byte[] broken)
    {
        Assert.Null(ImageMetadataStripper.Strip(broken, "image/jpeg"));
    }

    [Fact]
    public void Png_KeepsOnlyTheChunksNeededToRenderIt()
    {
        var header = PngChunk("IHDR", new byte[13]);
        var profile = PngChunk("iCCP", Ascii("sRGB\0\0profile"));
        var density = PngChunk("pHYs", new byte[9]);
        var text = PngChunk("tEXt", Ascii("Author\0Alice Martin"));
        var compressedText = PngChunk("zTXt", Ascii("Comment\0\0secret"));
        var exif = PngChunk("eXIf", Ascii("GPS-SECRET"));
        var credentials = PngChunk("caBX", Ascii("c2pa manifest"));
        var privateChunk = PngChunk("prVt", Ascii("device serial"));
        var pixels = PngChunk("IDAT", [1, 2, 3, 4]);
        var end = PngChunk("IEND", []);
        var original = Concat(
            PngSignature, header, profile, density, text, compressedText, exif, credentials, privateChunk, pixels, end,
            Ascii("TRAILER"));

        var stripped = ImageMetadataStripper.Strip(original, "image/png");

        Assert.Equal(Concat(PngSignature, header, profile, density, pixels, end), stripped);
    }

    [Fact]
    public void Png_WithAChunkRunningPastTheEnd_IsRefused()
    {
        var header = PngChunk("IHDR", new byte[13]);
        var overflowing = Concat([0xFF, 0xFF, 0xFF, 0xFF], Ascii("IDAT"), [1, 2, 3]);
        var truncated = PngChunk("IDAT", [1, 2, 3, 4])[..10];

        Assert.Null(ImageMetadataStripper.Strip(Concat(PngSignature, header, overflowing), "image/png"));
        Assert.Null(ImageMetadataStripper.Strip(Concat(PngSignature, header, truncated), "image/png"));
    }

    [Fact]
    public void Webp_KeepsOnlyTheChunksNeededToRenderIt_AndClearsTheMetadataFlags()
    {
        var extended = WebpChunk("VP8X", [0x20 | 0x10 | 0x0C, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        var profile = WebpChunk("ICCP", [1, 2, 3]);
        var image = WebpChunk("VP8 ", [9, 8, 7]);
        var exif = WebpChunk("EXIF", Ascii("GPS-SECRET"));
        var xmp = WebpChunk("XMP ", Ascii("<x:xmpmeta/>"));
        var credentials = WebpChunk("C2PA", Ascii("manifest"));

        var stripped = ImageMetadataStripper.Strip(Webp(extended, profile, image, exif, xmp, credentials), "image/webp");

        var expected = Webp(WebpChunk("VP8X", [0x20 | 0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0]), profile, image);
        Assert.Equal(expected, stripped);
    }

    [Fact]
    public void Webp_WithAChunkLargerThanTheFile_IsRefused()
    {
        var overflowing = Concat(Ascii("VP8 "), [0xFF, 0xFF, 0xFF, 0xFF], [1, 2]);

        Assert.Null(ImageMetadataStripper.Strip(Webp(overflowing), "image/webp"));
    }

    [Fact]
    public void Gif_LosesItsCommentsAndXmp_ButKeepsTheAnimationLoopAndFrames()
    {
        var comment = Concat([0x21, 0xFE, 0x05], Ascii("hello"), [0x00]);
        var xmp = Concat([0x21, 0xFF, 0x0B], Ascii("XMP DataXMP"), [0x04], Ascii("<x/>"), [0x00]);
        var original = Concat(GifHeader, GifLoop, comment, xmp, GifFrame, [0x3B], Ascii("TRAILER"));

        var stripped = ImageMetadataStripper.Strip(original, "image/gif");

        Assert.Equal(Concat(GifHeader, GifLoop, GifFrame, [0x3B]), stripped);
    }

    [Fact]
    public void Gif_WithoutMetadata_IsKeptAsIs()
    {
        var gif = Concat(Ascii("GIF89a"), [1, 0, 1, 0, 0, 0, 0, 0x3B]);

        Assert.Equal(gif, ImageMetadataStripper.Strip(gif, "image/gif"));
    }

    [Fact]
    public void Gif_WithATruncatedBlock_IsRefused()
    {
        var truncated = Concat(GifHeader, [0x21, 0xFE, 0x09], Ascii("cut"));

        Assert.Null(ImageMetadataStripper.Strip(truncated, "image/gif"));
    }

    [Fact]
    public void AnUnknownFormat_IsRefused()
    {
        Assert.Null(ImageMetadataStripper.Strip(Ascii("BM whatever"), "image/bmp"));
    }

    public static TheoryData<string, byte[]> WellFormedSamples() => new()
    {
        {
            "image/jpeg",
            Concat(
                [0xFF, 0xD8],
                JpegSegment(0xE0, Concat(Ascii("JFIF\0"), [1, 1, 0, 0, 1, 0, 1, 0, 0])),
                ExifWithOrientation(6),
                JpegSegment(0xFE, Ascii("comment")),
                JpegScan(0xAB, 0xFF, 0x00, 0xFF, 0xD3, 0xCD),
                [0xFF, 0xD9])
        },
        {
            "image/png",
            Concat(PngSignature, PngChunk("IHDR", new byte[13]), PngChunk("tEXt", Ascii("a\0b")), PngChunk("IDAT", [1, 2]), PngChunk("IEND", []))
        },
        {
            "image/webp",
            Webp(WebpChunk("VP8X", [0x0C, 0, 0, 0, 0, 0, 0, 0, 0, 0]), WebpChunk("VP8 ", [9, 8, 7]), WebpChunk("EXIF", Ascii("gps")))
        },
        {
            "image/gif",
            Concat(GifHeader, GifLoop, Concat([0x21, 0xFE, 0x02], Ascii("hi"), [0x00]), GifFrame, [0x3B])
        }
    };

    [Theory]
    [MemberData(nameof(WellFormedSamples))]
    public void Strip_NeverThrows_WhateverTheCorruption(string contentType, byte[] sample)
    {
        Assert.NotNull(ImageMetadataStripper.Strip(sample, contentType));

        var random = new Random(20260923);
        for (var round = 0; round < 3000; round++)
        {
            var mutated = sample.ToArray();
            var flips = random.Next(1, 6);
            for (var flip = 0; flip < flips; flip++)
                mutated[random.Next(mutated.Length)] = (byte)random.Next(256);
            var length = random.Next(2) == 0 ? mutated.Length : random.Next(mutated.Length + 1);

            var ex = Record.Exception(() => ImageMetadataStripper.Strip(mutated[..length], contentType));

            Assert.Null(ex);
        }
    }
}

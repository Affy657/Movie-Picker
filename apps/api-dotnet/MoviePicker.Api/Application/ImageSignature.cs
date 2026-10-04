namespace MoviePicker.Api.Application;

public static class ImageSignature
{
    public const string Png = "image/png";
    public const string Jpeg = "image/jpeg";
    public const string Gif = "image/gif";
    public const string Webp = "image/webp";

    private static ReadOnlySpan<byte> PngMagic => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static ReadOnlySpan<byte> JpegMagic => [0xFF, 0xD8, 0xFF];

    public static string? Detect(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith(PngMagic))
            return Png;
        if (bytes.StartsWith(JpegMagic))
            return Jpeg;
        if (bytes.Length >= 6 && bytes[..3].SequenceEqual("GIF"u8) && (bytes[3..6].SequenceEqual("87a"u8) || bytes[3..6].SequenceEqual("89a"u8)))
            return Gif;
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
            return Webp;
        return null;
    }
}

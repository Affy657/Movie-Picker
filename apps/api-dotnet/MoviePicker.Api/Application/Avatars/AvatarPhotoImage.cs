using System.Buffers.Binary;

namespace MoviePicker.Api.Application.Avatars;

public sealed record AvatarPhotoFormat(string ContentType, int Width, int Height);

public static class AvatarPhotoImage
{
    public const int MaxBytes = 512 * 1024;
    public const int MaxBase64Length = (MaxBytes + 2) / 3 * 4;
    public const int MinSide = 128;
    public const int MaxSide = 1024;

    private const byte WebpAnimationFlag = 0x02;

    private const int PngSignatureLength = 8;

    public static AvatarPhotoFormat? Inspect(ReadOnlySpan<byte> bytes) => ImageSignature.Detect(bytes) switch
    {
        ImageSignature.Png => InspectPng(bytes),
        ImageSignature.Jpeg => InspectJpeg(bytes),
        ImageSignature.Webp => InspectWebp(bytes),
        _ => null
    };

    public static AvatarPhotoFormat? AcceptedFormatOf(ReadOnlySpan<byte> bytes) =>
        bytes.Length is > 0 and <= MaxBytes && Inspect(bytes) is { } format && HasAcceptedSize(format)
            ? format
            : null;

    public static bool HasAcceptedSize(AvatarPhotoFormat format) =>
        format.Width is >= MinSide and <= MaxSide && format.Height is >= MinSide and <= MaxSide;

    private static AvatarPhotoFormat? InspectPng(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 24 || !bytes[12..16].SequenceEqual("IHDR"u8) || IsAnimatedPng(bytes))
            return null;
        var width = BinaryPrimitives.ReadInt32BigEndian(bytes[16..20]);
        var height = BinaryPrimitives.ReadInt32BigEndian(bytes[20..24]);
        return Format(ImageSignature.Png, width, height);
    }

    private static bool IsAnimatedPng(ReadOnlySpan<byte> bytes)
    {
        var index = PngSignatureLength;
        while (index + 8 <= bytes.Length)
        {
            var type = bytes[(index + 4)..(index + 8)];
            if (type.SequenceEqual("acTL"u8))
                return true;
            if (type.SequenceEqual("IDAT"u8))
                return false;
            var length = BinaryPrimitives.ReadUInt32BigEndian(bytes[index..(index + 4)]);
            if (length > (uint)(bytes.Length - index))
                return false;
            index += 12 + (int)length;
        }
        return false;
    }

    private static AvatarPhotoFormat? InspectJpeg(ReadOnlySpan<byte> bytes)
    {
        var index = 2;
        while (index > 0 && index + 3 < bytes.Length)
        {
            if (bytes[index] != 0xFF)
                return null;
            var marker = bytes[index + 1];
            if (marker is 0xD9 or 0xDA)
                return null;
            if (IsStartOfFrame(marker))
                return ReadJpegFrame(bytes, index);
            index = NextJpegSegment(bytes, index, marker);
        }
        return null;
    }

    private static int NextJpegSegment(ReadOnlySpan<byte> bytes, int index, byte marker)
    {
        if (marker == 0xFF)
            return index + 1;
        if (marker is 0xD8 or 0x01 or (>= 0xD0 and <= 0xD7))
            return index + 2;
        var length = BinaryPrimitives.ReadUInt16BigEndian(bytes[(index + 2)..(index + 4)]);
        return length < 2 ? -1 : index + 2 + length;
    }

    private static AvatarPhotoFormat? ReadJpegFrame(ReadOnlySpan<byte> bytes, int index)
    {
        if (index + 9 > bytes.Length)
            return null;
        var height = BinaryPrimitives.ReadUInt16BigEndian(bytes[(index + 5)..(index + 7)]);
        var width = BinaryPrimitives.ReadUInt16BigEndian(bytes[(index + 7)..(index + 9)]);
        return Format(ImageSignature.Jpeg, width, height);
    }

    private static bool IsStartOfFrame(byte marker) =>
        marker is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC;

    private static AvatarPhotoFormat? InspectWebp(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 30)
            return null;
        var chunk = bytes[12..16];
        if (chunk.SequenceEqual("VP8X"u8))
        {
            if ((bytes[20] & WebpAnimationFlag) != 0)
                return null;
            return Format(ImageSignature.Webp, 1 + ReadUInt24LittleEndian(bytes[24..27]), 1 + ReadUInt24LittleEndian(bytes[27..30]));
        }
        if (chunk.SequenceEqual("VP8 "u8))
        {
            if (bytes[23] != 0x9D || bytes[24] != 0x01 || bytes[25] != 0x2A)
                return null;
            var width = BinaryPrimitives.ReadUInt16LittleEndian(bytes[26..28]) & 0x3FFF;
            var height = BinaryPrimitives.ReadUInt16LittleEndian(bytes[28..30]) & 0x3FFF;
            return Format(ImageSignature.Webp, width, height);
        }
        if (chunk.SequenceEqual("VP8L"u8))
        {
            if (bytes[20] != 0x2F)
                return null;
            var bits = BinaryPrimitives.ReadUInt32LittleEndian(bytes[21..25]);
            return Format(ImageSignature.Webp, 1 + (int)(bits & 0x3FFF), 1 + (int)((bits >> 14) & 0x3FFF));
        }
        return null;
    }

    private static int ReadUInt24LittleEndian(ReadOnlySpan<byte> bytes) => bytes[0] | (bytes[1] << 8) | (bytes[2] << 16);

    private static AvatarPhotoFormat? Format(string contentType, int width, int height) =>
        width > 0 && height > 0 ? new AvatarPhotoFormat(contentType, width, height) : null;
}

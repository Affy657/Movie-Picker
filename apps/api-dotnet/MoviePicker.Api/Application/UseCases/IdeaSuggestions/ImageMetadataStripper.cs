using System.Buffers.Binary;
using System.Text;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public static class ImageMetadataStripper
{
    private const byte JpegMarkerPrefix = 0xFF;
    private const byte JpegStartOfImage = 0xD8;
    private const byte JpegEndOfImage = 0xD9;
    private const byte JpegStartOfScan = 0xDA;
    private const byte JpegComment = 0xFE;
    private const byte JpegJfif = 0xE0;
    private const byte JpegExif = 0xE1;
    private const byte JpegIccProfile = 0xE2;
    private const byte JpegAdobe = 0xEE;
    private const int JfifHeaderLength = 14;
    private const ushort ExifOrientationTag = 0x0112;
    private const ushort ExifShortType = 3;
    private const byte WebpExifAndXmpFlags = 0x08 | 0x04;
    private const int GifHeaderLength = 13;
    private const byte GifTrailer = 0x3B;
    private const byte GifImageDescriptor = 0x2C;
    private const byte GifExtension = 0x21;
    private const byte GifApplicationExtension = 0xFF;
    private const byte GifCommentExtension = 0xFE;

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static readonly HashSet<string> PngRenderingChunks =
    [
        "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "cICP", "sBIT", "pHYs", "bKGD",
        "acTL", "fcTL", "fdAT"
    ];

    private static readonly HashSet<string> WebpRenderingChunks = ["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"];

    private static readonly byte[][] GifAnimationApplications = ["NETSCAPE2.0"u8.ToArray(), "ANIMEXTS1.0"u8.ToArray()];

    public static byte[]? Strip(byte[] image, string contentType) => contentType switch
    {
        "image/jpeg" => StripJpeg(image),
        "image/png" => StripPng(image),
        "image/webp" => StripWebp(image),
        "image/gif" => StripGif(image),
        _ => null
    };

    private static bool IsStandaloneJpegMarker(byte marker) => marker is 0x01 or (>= 0xD0 and <= 0xD7);

    private static byte[]? StripJpeg(byte[] image)
    {
        if (image.Length < 4 || image[0] != JpegMarkerPrefix || image[1] != JpegStartOfImage)
            return null;

        using var output = new MemoryStream(image.Length);
        output.Write(image, 0, 2);
        var offset = 2;
        while (offset < image.Length)
        {
            var read = ReadJpegMarker(image, offset);
            if (read is null)
                return null;

            var (marker, next) = read.Value;
            if (marker == JpegEndOfImage)
            {
                output.Write([JpegMarkerPrefix, JpegEndOfImage]);
                return output.ToArray();
            }
            if (IsStandaloneJpegMarker(marker))
            {
                output.Write([JpegMarkerPrefix, marker]);
                offset = next;
                continue;
            }

            offset = CopyJpegSegment(image, output, marker, next);
            if (offset < 0)
                return null;
        }

        return output.ToArray();
    }

    private static (byte Marker, int Next)? ReadJpegMarker(byte[] image, int offset)
    {
        if (image[offset] != JpegMarkerPrefix)
            return null;

        var index = offset;
        while (index < image.Length && image[index] == JpegMarkerPrefix)
            index++;
        return index < image.Length ? (image[index], index + 1) : null;
    }

    private static int CopyJpegSegment(byte[] image, MemoryStream output, byte marker, int offset)
    {
        if (marker is JpegStartOfImage or 0x00 || offset + 2 > image.Length)
            return -1;

        var segmentEnd = offset + BinaryPrimitives.ReadUInt16BigEndian(image.AsSpan(offset, 2));
        if (segmentEnd < offset + 2 || segmentEnd > image.Length)
            return -1;

        WriteJpegSegment(output, marker, image.AsSpan(offset, segmentEnd - offset));
        if (marker != JpegStartOfScan)
            return segmentEnd;

        var scanEnd = EntropyCodedDataEnd(image, segmentEnd);
        output.Write(image, segmentEnd, scanEnd - segmentEnd);
        return scanEnd;
    }

    private static void WriteJpegSegment(MemoryStream output, byte marker, ReadOnlySpan<byte> segment)
    {
        var payload = segment[2..];
        if (marker == JpegJfif)
        {
            WriteJfifWithoutThumbnail(output, payload);
            return;
        }
        if (marker == JpegExif)
        {
            WriteExifOrientationOnly(output, payload);
            return;
        }
        if (IsJpegMetadata(marker, payload))
            return;

        output.Write([JpegMarkerPrefix, marker]);
        output.Write(segment);
    }

    private static bool IsJpegMetadata(byte marker, ReadOnlySpan<byte> payload) => marker switch
    {
        JpegComment => true,
        JpegIccProfile => !payload.StartsWith("ICC_PROFILE\0"u8),
        JpegAdobe => !payload.StartsWith("Adobe"u8),
        >= 0xE0 and <= 0xEF => true,
        _ => false
    };

    private static void WriteJfifWithoutThumbnail(MemoryStream output, ReadOnlySpan<byte> payload)
    {
        if (payload.Length < JfifHeaderLength || !payload.StartsWith("JFIF\0"u8))
            return;

        output.Write([JpegMarkerPrefix, JpegJfif, 0x00, JfifHeaderLength + 2]);
        output.Write(payload[..(JfifHeaderLength - 2)]);
        output.Write([0x00, 0x00]);
    }

    private static void WriteExifOrientationOnly(MemoryStream output, ReadOnlySpan<byte> payload)
    {
        var orientation = ReadExifOrientation(payload);
        if (orientation is not (>= 2 and <= 8))
            return;

        output.Write([
            JpegMarkerPrefix, JpegExif, 0x00, 0x22,
            (byte)'E', (byte)'x', (byte)'i', (byte)'f', 0x00, 0x00,
            (byte)'M', (byte)'M', 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08,
            0x00, 0x01,
            0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, (byte)orientation, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00
        ]);
    }

    private static int? ReadExifOrientation(ReadOnlySpan<byte> payload)
    {
        if (!payload.StartsWith("Exif\0\0"u8))
            return null;

        var tiff = payload[6..];
        if (tiff.Length < 8)
            return null;

        bool littleEndian;
        if (tiff.StartsWith("II"u8))
            littleEndian = true;
        else if (tiff.StartsWith("MM"u8))
            littleEndian = false;
        else
            return null;

        var ifdOffset = ReadUInt32(tiff[4..], littleEndian);
        if (ifdOffset > (uint)(tiff.Length - 2))
            return null;

        var entryCount = ReadUInt16(tiff[(int)ifdOffset..], littleEndian);
        for (var index = 0; index < entryCount; index++)
        {
            var entry = (int)ifdOffset + 2 + index * 12;
            if (entry + 12 > tiff.Length)
                return null;
            if (ReadUInt16(tiff[entry..], littleEndian) != ExifOrientationTag)
                continue;
            if (ReadUInt16(tiff[(entry + 2)..], littleEndian) != ExifShortType)
                return null;
            return ReadUInt16(tiff[(entry + 8)..], littleEndian);
        }

        return null;
    }

    private static ushort ReadUInt16(ReadOnlySpan<byte> bytes, bool littleEndian) =>
        littleEndian ? BinaryPrimitives.ReadUInt16LittleEndian(bytes) : BinaryPrimitives.ReadUInt16BigEndian(bytes);

    private static uint ReadUInt32(ReadOnlySpan<byte> bytes, bool littleEndian) =>
        littleEndian ? BinaryPrimitives.ReadUInt32LittleEndian(bytes) : BinaryPrimitives.ReadUInt32BigEndian(bytes);

    private static int EntropyCodedDataEnd(byte[] image, int from)
    {
        var index = from;
        while (index + 1 < image.Length)
        {
            if (image[index] != JpegMarkerPrefix)
            {
                index++;
                continue;
            }

            var next = image[index + 1];
            if (next is 0x00 or (>= 0xD0 and <= 0xD7))
            {
                index += 2;
                continue;
            }

            return index;
        }

        return image.Length;
    }

    private static byte[]? StripPng(byte[] image)
    {
        if (image.Length < PngSignature.Length || !image.AsSpan(0, PngSignature.Length).SequenceEqual(PngSignature))
            return null;

        using var output = new MemoryStream(image.Length);
        output.Write(PngSignature);
        var offset = PngSignature.Length;
        while (offset + 8 <= image.Length)
        {
            var chunkEnd = offset + 12L + BinaryPrimitives.ReadUInt32BigEndian(image.AsSpan(offset, 4));
            if (chunkEnd > image.Length)
                return null;

            var type = Encoding.ASCII.GetString(image, offset + 4, 4);
            if (PngRenderingChunks.Contains(type))
                output.Write(image, offset, (int)chunkEnd - offset);
            offset = (int)chunkEnd;
            if (type == "IEND")
                break;
        }

        return output.ToArray();
    }

    private static byte[]? StripWebp(byte[] image)
    {
        if (image.Length < 12 || !image.AsSpan(0, 4).SequenceEqual("RIFF"u8) || !image.AsSpan(8, 4).SequenceEqual("WEBP"u8))
            return null;

        var end = (int)Math.Min(8L + BinaryPrimitives.ReadUInt32LittleEndian(image.AsSpan(4, 4)), image.Length);
        using var output = new MemoryStream(image.Length);
        output.Write(image, 0, 12);
        var extendedFlagsIndex = -1;
        var offset = 12;
        while (offset + 8 <= end)
        {
            var size = BinaryPrimitives.ReadUInt32LittleEndian(image.AsSpan(offset + 4, 4));
            var chunkEnd = offset + 8L + size + (size % 2);
            if (chunkEnd > end)
                return null;

            var fourCc = Encoding.ASCII.GetString(image, offset, 4);
            if (WebpRenderingChunks.Contains(fourCc))
            {
                if (fourCc == "VP8X" && size > 0)
                    extendedFlagsIndex = (int)output.Position + 8;
                output.Write(image, offset, (int)chunkEnd - offset);
            }
            offset = (int)chunkEnd;
        }

        var stripped = output.ToArray();
        if (extendedFlagsIndex >= 0)
            stripped[extendedFlagsIndex] &= unchecked((byte)~WebpExifAndXmpFlags);
        BinaryPrimitives.WriteUInt32LittleEndian(stripped.AsSpan(4, 4), (uint)(stripped.Length - 8));
        return stripped;
    }

    private static byte[]? StripGif(byte[] image)
    {
        if (image.Length < GifHeaderLength || !image.AsSpan(0, 3).SequenceEqual("GIF"u8))
            return null;

        var offset = GifHeaderLength + ColorTableLength(image[10]);
        if (offset > image.Length)
            return null;

        using var output = new MemoryStream(image.Length);
        output.Write(image, 0, offset);
        while (offset < image.Length && image[offset] != GifTrailer)
        {
            offset = CopyGifBlock(image, output, offset);
            if (offset < 0)
                return null;
        }

        output.WriteByte(GifTrailer);
        return output.ToArray();
    }

    private static int CopyGifBlock(byte[] image, MemoryStream output, int offset) => image[offset] switch
    {
        GifImageDescriptor => CopyGifImage(image, output, offset),
        GifExtension => CopyGifExtension(image, output, offset),
        _ => -1
    };

    private static int CopyGifImage(byte[] image, MemoryStream output, int offset)
    {
        if (offset + 10 > image.Length)
            return -1;

        var blockEnd = SubBlocksEnd(image, offset + 10 + ColorTableLength(image[offset + 9]) + 1);
        if (blockEnd >= 0)
            output.Write(image, offset, blockEnd - offset);
        return blockEnd;
    }

    private static int CopyGifExtension(byte[] image, MemoryStream output, int offset)
    {
        if (offset + 2 > image.Length)
            return -1;

        var blockEnd = SubBlocksEnd(image, offset + 2);
        if (blockEnd >= 0 && !IsGifMetadataExtension(image[offset + 1], image.AsSpan(offset + 2, blockEnd - offset - 2)))
            output.Write(image, offset, blockEnd - offset);
        return blockEnd;
    }

    private static int ColorTableLength(byte flags) => (flags & 0x80) == 0 ? 0 : 3 * (1 << ((flags & 0x07) + 1));

    private static int SubBlocksEnd(byte[] image, int from)
    {
        var offset = from;
        while (offset < image.Length)
        {
            var size = image[offset];
            offset += 1 + size;
            if (size == 0)
                return offset;
        }

        return -1;
    }

    private static bool IsGifMetadataExtension(byte label, ReadOnlySpan<byte> subBlocks) => label switch
    {
        GifCommentExtension => true,
        GifApplicationExtension => !IsGifAnimationApplication(subBlocks),
        _ => false
    };

    private static bool IsGifAnimationApplication(ReadOnlySpan<byte> subBlocks)
    {
        if (subBlocks.Length < 12 || subBlocks[0] != 11)
            return false;

        var identifier = subBlocks.Slice(1, 11);
        foreach (var application in GifAnimationApplications)
        {
            if (identifier.SequenceEqual(application))
                return true;
        }

        return false;
    }
}

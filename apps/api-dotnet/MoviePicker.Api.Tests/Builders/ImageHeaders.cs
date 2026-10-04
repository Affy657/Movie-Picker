using System.Buffers.Binary;
using System.Text;

namespace MoviePicker.Api.Tests.Builders;

internal static class ImageHeaders
{
    public static byte[] Png(int width, int height, bool animated = false)
    {
        var bytes = new List<byte> { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        bytes.AddRange(Encoding.ASCII.GetBytes("IHDR"));
        bytes.AddRange(BigEndian32(width));
        bytes.AddRange(BigEndian32(height));
        bytes.AddRange([0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        if (animated)
            bytes.AddRange(PngChunk("acTL", [0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00]));
        bytes.AddRange(PngChunk("IDAT", [0x78, 0x9C, 0x03, 0x00]));
        bytes.AddRange(PngChunk("IEND", []));
        return [.. bytes];
    }

    public static byte[] Jpeg(int width, int height, byte startOfFrameMarker = 0xC0)
    {
        var bytes = new List<byte> { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };
        bytes.AddRange(Encoding.ASCII.GetBytes("JFIF\0"));
        bytes.AddRange([0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
        bytes.AddRange([0xFF, 0xDB, 0x00, 0x04, 0x00, 0x00]);
        bytes.AddRange([0xFF, startOfFrameMarker, 0x00, 0x11, 0x08]);
        bytes.AddRange(BigEndian16(height));
        bytes.AddRange(BigEndian16(width));
        bytes.AddRange([0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
        bytes.AddRange([0xFF, 0xD9]);
        return [.. bytes];
    }

    public static byte[] JpegWithoutFrame() =>
        [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x04, 0x00, 0x00, 0xFF, 0xD9];

    public static byte[] WebpLossy(int width, int height)
    {
        var payload = new List<byte> { 0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A };
        payload.AddRange(LittleEndian16(width));
        payload.AddRange(LittleEndian16(height));
        payload.AddRange(new byte[8]);
        return Riff("VP8 ", payload);
    }

    public static byte[] WebpLossless(int width, int height)
    {
        var bits = (uint)(width - 1) | ((uint)(height - 1) << 14);
        var payload = new List<byte> { 0x2F };
        payload.AddRange(LittleEndian32(bits));
        payload.AddRange(new byte[8]);
        return Riff("VP8L", payload);
    }

    public static byte[] WebpExtended(int width, int height, bool animated = false)
    {
        var payload = new List<byte> { animated ? (byte)0x02 : (byte)0x00, 0x00, 0x00, 0x00 };
        payload.AddRange(LittleEndian24(width - 1));
        payload.AddRange(LittleEndian24(height - 1));
        return Riff("VP8X", payload);
    }

    public static byte[] Gif(int width, int height)
    {
        var bytes = new List<byte>(Encoding.ASCII.GetBytes("GIF89a"));
        bytes.AddRange(LittleEndian16(width));
        bytes.AddRange(LittleEndian16(height));
        bytes.AddRange([0x00, 0x00, 0x00, 0x3B]);
        return [.. bytes];
    }

    public static byte[] Svg() =>
        Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"256\" height=\"256\"></svg>");

    private static List<byte> PngChunk(string type, byte[] data)
    {
        var chunk = new List<byte>(BigEndian32(data.Length));
        chunk.AddRange(Encoding.ASCII.GetBytes(type));
        chunk.AddRange(data);
        chunk.AddRange([0x00, 0x00, 0x00, 0x00]);
        return chunk;
    }

    private static byte[] Riff(string chunk, List<byte> payload)
    {
        var body = new List<byte>(Encoding.ASCII.GetBytes("WEBP"));
        body.AddRange(Encoding.ASCII.GetBytes(chunk));
        body.AddRange(LittleEndian32((uint)payload.Count));
        body.AddRange(payload);
        var bytes = new List<byte>(Encoding.ASCII.GetBytes("RIFF"));
        bytes.AddRange(LittleEndian32((uint)body.Count));
        bytes.AddRange(body);
        return [.. bytes];
    }

    private static byte[] BigEndian32(int value)
    {
        var buffer = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(buffer, value);
        return buffer;
    }

    private static byte[] BigEndian16(int value)
    {
        var buffer = new byte[2];
        BinaryPrimitives.WriteUInt16BigEndian(buffer, (ushort)value);
        return buffer;
    }

    private static byte[] LittleEndian16(int value)
    {
        var buffer = new byte[2];
        BinaryPrimitives.WriteUInt16LittleEndian(buffer, (ushort)value);
        return buffer;
    }

    private static byte[] LittleEndian24(int value) =>
        [(byte)(value & 0xFF), (byte)((value >> 8) & 0xFF), (byte)((value >> 16) & 0xFF)];

    private static byte[] LittleEndian32(uint value)
    {
        var buffer = new byte[4];
        BinaryPrimitives.WriteUInt32LittleEndian(buffer, value);
        return buffer;
    }
}

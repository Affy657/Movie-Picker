using System.Text;

namespace MoviePicker.Api.Domain.TwoFactor;

public static class Base32
{
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private const int BitsPerSymbol = 5;
    private const int BitsPerByte = 8;
    private const int SymbolMask = 0x1F;

    public static string Encode(byte[] data)
    {
        var output = new StringBuilder((data.Length * BitsPerByte + BitsPerSymbol - 1) / BitsPerSymbol);
        var buffer = 0;
        var bits = 0;
        foreach (var b in data)
        {
            buffer = (buffer << BitsPerByte) | b;
            bits += BitsPerByte;
            while (bits >= BitsPerSymbol)
            {
                bits -= BitsPerSymbol;
                output.Append(Alphabet[(buffer >> bits) & SymbolMask]);
            }
        }

        if (bits > 0)
            output.Append(Alphabet[(buffer << (BitsPerSymbol - bits)) & SymbolMask]);
        return output.ToString();
    }

    public static byte[]? Decode(string text)
    {
        var output = new List<byte>(text.Length * BitsPerSymbol / BitsPerByte);
        var buffer = 0;
        var bits = 0;
        foreach (var c in text.ToUpperInvariant())
        {
            if (c is ' ' or '=')
                continue;
            var value = Alphabet.IndexOf(c);
            if (value < 0)
                return null;
            buffer = (buffer << BitsPerSymbol) | value;
            bits += BitsPerSymbol;
            if (bits >= BitsPerByte)
            {
                bits -= BitsPerByte;
                output.Add((byte)(buffer >> bits));
            }
        }

        return [.. output];
    }
}

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class TextTruncation
{
    public static string ToMaxLength(string text, int maxLength)
    {
        if (text.Length <= maxLength)
            return text;

        var cut = char.IsHighSurrogate(text[maxLength - 1]) ? maxLength - 1 : maxLength;
        return text[..cut].TrimEnd();
    }
}

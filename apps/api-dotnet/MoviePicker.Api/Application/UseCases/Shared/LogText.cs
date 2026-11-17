using System.Text.RegularExpressions;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static partial class LogText
{
    private const string Blank = " ";

    public static string SingleLine(string? value) =>
        ControlCharacter().Replace((value ?? string.Empty).ReplaceLineEndings(Blank), Blank);

    [GeneratedRegex(@"\p{Cc}", RegexOptions.CultureInvariant)]
    private static partial Regex ControlCharacter();
}

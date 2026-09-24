namespace MoviePicker.Api.Application.UseCases.Shared;

public static class EnumNames
{
    public static bool TryParse<T>(string? raw, out T value) where T : struct, Enum
    {
        var name = raw?.Trim();
        foreach (var candidate in Enum.GetValues<T>())
        {
            if (string.Equals(candidate.ToString(), name, StringComparison.OrdinalIgnoreCase))
            {
                value = candidate;
                return true;
            }
        }

        value = default;
        return false;
    }
}

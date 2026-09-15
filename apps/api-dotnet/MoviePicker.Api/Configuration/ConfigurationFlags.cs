namespace MoviePicker.Api.Configuration;

public static class ConfigurationFlags
{
    public static bool IsEnabled(string? raw, bool defaultValue)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return defaultValue;

        var value = raw.Trim();
        if (value == "1" || value.Equals("true", StringComparison.OrdinalIgnoreCase))
            return true;
        if (value == "0" || value.Equals("false", StringComparison.OrdinalIgnoreCase))
            return false;
        return defaultValue;
    }
}

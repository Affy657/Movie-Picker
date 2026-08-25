namespace MoviePicker.Api.Infrastructure;

public static class EnvLoader
{
    private const int MaxParentLevels = 8;

    public static void LoadFromEnvFileIfExists() =>
        LoadFromEnvFileIfExists(Directory.GetCurrentDirectory());

    internal static void LoadFromEnvFileIfExists(string startDirectory)
    {
        var dir = startDirectory;
        for (var i = 0; i < MaxParentLevels && !string.IsNullOrEmpty(dir); i++)
        {
            var path = Path.Combine(dir, ".env");
            if (File.Exists(path))
                ApplyEnvFile(path);
            dir = Path.GetDirectoryName(dir);
        }
    }

    private static void ApplyEnvFile(string path)
    {
        foreach (var line in File.ReadLines(path))
        {
            if (!TryParseEnvLine(line, out var key, out var value))
                continue;
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    internal static bool TryParseEnvLine(string line, out string key, out string value)
    {
        key = string.Empty;
        value = string.Empty;

        var trimmed = line.Trim();
        if (trimmed.Length == 0 || trimmed[0] == '#')
            return false;

        var eq = trimmed.IndexOf('=');
        if (eq <= 0)
            return false;

        key = trimmed[0..eq].Trim();
        value = trimmed[(eq + 1)..].Trim();
        if (value.Length >= 2 && value[0] == '"' && value[^1] == '"')
            value = value[1..^1].Replace("\\\"", "\"");

        return true;
    }
}

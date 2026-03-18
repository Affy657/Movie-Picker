namespace MoviePicker.Api.Infrastructure;

/// <summary>
/// Charge un fichier .env (lignes KEY=VALUE) dans l'environnement, pour le run local sans exporter les variables à la main.
/// Cherche .env en remontant depuis le répertoire courant (monorepo : .env à la racine).
/// </summary>
public static class EnvLoader
{
    private const int MaxParentLevels = 8;

    public static void LoadFromEnvFileIfExists()
    {
        var dir = Directory.GetCurrentDirectory();
        for (var i = 0; i < MaxParentLevels && !string.IsNullOrEmpty(dir); i++)
        {
            var path = Path.Combine(dir, ".env");
            if (!File.Exists(path)) { dir = Path.GetDirectoryName(dir); continue; }

            foreach (var line in File.ReadLines(path))
            {
                var trimmed = line.Trim();
                if (trimmed.Length == 0 || trimmed[0] == '#') continue;
                var eq = trimmed.IndexOf('=');
                if (eq <= 0) continue;
                var key = trimmed[0..eq].Trim();
                var value = trimmed[(eq + 1)..].Trim();
                if (value.Length >= 2 && value[0] == '"' && value[^1] == '"')
                    value = value[1..^1].Replace("\\\"", "\"");
                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                    Environment.SetEnvironmentVariable(key, value);
            }
            return;
        }
    }
}

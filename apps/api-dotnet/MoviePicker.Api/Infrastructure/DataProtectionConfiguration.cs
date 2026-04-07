using Microsoft.AspNetCore.DataProtection;

namespace MoviePicker.Api.Infrastructure;

/// <summary>
/// Partage les clés Data Protection entre instances Cloud Run via le secret <c>AUTH_DATAPROTECTION_KEYRING</c>
/// (XML d’une clé, même contenu sur toutes les révisions).
/// </summary>
public static class DataProtectionConfiguration
{
    internal const string ApplicationName = "MoviePicker";

    /// <summary>
    /// Nom de variable d’environnement / entrée de config aligné sur <c>--set-secrets</c> Cloud Run.
    /// </summary>
    public const string KeyRingXmlEnvName = "AUTH_DATAPROTECTION_KEYRING";

    public static void AddSharedDataProtection(this WebApplicationBuilder builder)
    {
        var xml =
            builder.Configuration[KeyRingXmlEnvName]
            ?? Environment.GetEnvironmentVariable(KeyRingXmlEnvName);

        if (string.IsNullOrWhiteSpace(xml))
            return;

        var dir = Path.Combine(Path.GetTempPath(), "moviepicker-dp-keys");
        Directory.CreateDirectory(dir);
        foreach (var existing in Directory.EnumerateFiles(dir, "*.xml"))
            File.Delete(existing);

        var fileName = Path.Combine(dir, Guid.NewGuid() + ".xml");
        File.WriteAllText(fileName, xml.Trim());

        builder.Services
            .AddDataProtection()
            .SetApplicationName(ApplicationName)
            .PersistKeysToFileSystem(new DirectoryInfo(dir));
    }
}

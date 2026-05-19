using Microsoft.AspNetCore.DataProtection;

namespace MoviePicker.Api.Infrastructure;

public static class DataProtectionConfiguration
{
    internal const string ApplicationName = "MoviePicker";

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

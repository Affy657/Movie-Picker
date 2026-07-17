using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure;

public static class DataProtectionConfiguration
{
    internal const string ApplicationName = "MoviePicker";

    public const string KeyRingXmlEnvName = "AUTH_DATAPROTECTION_KEYRING";

    public static void AddSharedDataProtection(this WebApplicationBuilder builder)
    {
        var dataProtection = builder.Services
            .AddDataProtection()
            .SetApplicationName(ApplicationName);

        if (!string.IsNullOrWhiteSpace(builder.Configuration["MONGODB_URI"]))
        {
            builder.Services.AddSingleton<IConfigureOptions<KeyManagementOptions>>(sp =>
            {
                var database = sp.GetRequiredService<IMongoDatabase>();
                return new ConfigureOptions<KeyManagementOptions>(options =>
                    options.XmlRepository = new MongoXmlRepository(database));
            });
            return;
        }

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

        dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dir));
    }
}

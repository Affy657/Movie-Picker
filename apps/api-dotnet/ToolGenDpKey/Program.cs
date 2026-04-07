using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;

// Génère une clé Data Protection compatible Movie Picker (SetApplicationName identique à l’API).
var dir = Path.Combine(Path.GetTempPath(), "moviepicker-dp-gen-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(dir);
var services = new ServiceCollection();
services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dir))
    .SetApplicationName("MoviePicker");

var sp = services.BuildServiceProvider();
var provider = sp.GetRequiredService<IDataProtectionProvider>();
_ = provider.CreateProtector("bootstrap").Protect(new byte[] { 1 });

var xmlPath = Directory.GetFiles(dir, "*.xml").Single();
var xml = await File.ReadAllTextAsync(xmlPath);

// stdout = contenu à mettre dans Secret Manager AUTH_DATAPROTECTION_KEYRING
Console.Write(xml);

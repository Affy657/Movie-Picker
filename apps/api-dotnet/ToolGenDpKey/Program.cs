using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;

var dir = Path.Combine(Path.GetTempPath(), "moviepicker-dp-gen-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(dir);
var services = new ServiceCollection();
services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dir))
    .SetApplicationName("MoviePicker")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(3650));

var sp = services.BuildServiceProvider();
var provider = sp.GetRequiredService<IDataProtectionProvider>();
_ = provider.CreateProtector("bootstrap").Protect(new byte[] { 1 });

var xmlPath = Directory.GetFiles(dir, "*.xml").Single();
var xml = await File.ReadAllTextAsync(xmlPath);

Console.Write(xml);

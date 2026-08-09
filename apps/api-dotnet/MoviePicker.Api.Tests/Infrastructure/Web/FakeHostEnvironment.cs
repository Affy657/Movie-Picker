using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

internal sealed class FakeHostEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = Environments.Production;
    public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}

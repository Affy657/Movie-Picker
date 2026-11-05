using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.IntegrationTests.Helpers;

public sealed class FakeWebShellSource : IWebShellSource
{
    public const string Shell =
        "<!doctype html><html lang=\"fr\"><head><meta charset=\"UTF-8\" />"
        + "<meta property=\"og:title\" content=\"Titre du site\" /><title>Titre du site</title>"
        + "<link rel=\"canonical\" href=\"https://web.integration.test/\" /></head>"
        + "<body><div id=\"root\"></div><script type=\"module\" src=\"/assets/index.js\"></script></body></html>";

    public string? Next { get; set; } = Shell;

    public Task<string?> GetShellAsync(CancellationToken ct = default) => Task.FromResult(Next);
}

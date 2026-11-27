using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class UserAgentDeviceTests
{
    [Theory]
    [InlineData(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Chrome", "Windows", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        "Edge", "Windows", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0",
        "Opera", "Windows", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Firefox", "Windows", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
        "Safari", "macOS", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Chrome", "Linux", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Chrome", "ChromeOS", DeviceKind.Desktop)]
    [InlineData(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
        "Safari", "iOS", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
        "Chrome", "iOS", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15",
        "Firefox", "iOS", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.2903.68 Version/18.0 Mobile/15E148 Safari/604.1",
        "Edge", "iOS", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
        "Safari", "iPadOS", DeviceKind.Tablet)]
    [InlineData(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.81 Mobile Safari/537.36",
        "Chrome", "Android", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.81 Safari/537.36",
        "Chrome", "Android", DeviceKind.Tablet)]
    [InlineData(
        "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
        "Samsung Internet", "Android", DeviceKind.Phone)]
    [InlineData(
        "Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0",
        "Firefox", "Android", DeviceKind.Phone)]
    public void Parse_RecognisesCommonBrowsersAndSystems(
        string userAgent, string browser, string operatingSystem, DeviceKind kind)
    {
        Assert.Equal(new UserAgentDevice(browser, operatingSystem, kind), UserAgentDevice.Parse(userAgent));
    }

    [Fact]
    public void Parse_InstalledIosAppWithoutBrowserToken_KeepsTheSystemAndLeavesTheBrowserUnknown()
    {
        var device = UserAgentDevice.Parse(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148");

        Assert.Equal(new UserAgentDevice(null, "iOS", DeviceKind.Phone), device);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("curl/8.5.0")]
    public void Parse_MissingOrUnrecognisedAgent_ReturnsUnknown(string? userAgent)
    {
        Assert.Equal(UserAgentDevice.Unknown, UserAgentDevice.Parse(userAgent));
    }
}

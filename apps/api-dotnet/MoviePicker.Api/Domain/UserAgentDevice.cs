namespace MoviePicker.Api.Domain;

public enum DeviceKind
{
    Unknown,
    Desktop,
    Phone,
    Tablet
}

public sealed record UserAgentDevice(string? Browser, string? OperatingSystem, DeviceKind Kind)
{
    public static readonly UserAgentDevice Unknown = new(null, null, DeviceKind.Unknown);

    private static readonly (string Token, string Name)[] BrowserTokens =
    [
        ("SamsungBrowser/", "Samsung Internet"),
        ("Edg/", "Edge"),
        ("EdgA/", "Edge"),
        ("EdgiOS/", "Edge"),
        ("OPR/", "Opera"),
        ("OPiOS/", "Opera"),
        ("Firefox/", "Firefox"),
        ("FxiOS/", "Firefox"),
        ("CriOS/", "Chrome"),
        ("Chrome/", "Chrome"),
        ("Safari/", "Safari")
    ];

    private static readonly (string Token, string Name)[] SystemTokens =
    [
        ("iPad", "iPadOS"),
        ("iPhone", "iOS"),
        ("iPod", "iOS"),
        ("Android", "Android"),
        ("CrOS", "ChromeOS"),
        ("Windows", "Windows"),
        ("Macintosh", "macOS"),
        ("Linux", "Linux")
    ];

    public static UserAgentDevice Parse(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return Unknown;

        var browser = FirstMatch(userAgent, BrowserTokens);
        var system = FirstMatch(userAgent, SystemTokens);
        if (browser is null && system is null)
            return Unknown;

        return new UserAgentDevice(browser, system, KindOf(system, userAgent));
    }

    private static string? FirstMatch(string userAgent, (string Token, string Name)[] tokens)
    {
        foreach (var (token, name) in tokens)
        {
            if (userAgent.Contains(token, StringComparison.Ordinal))
                return name;
        }
        return null;
    }

    private static DeviceKind KindOf(string? system, string userAgent) => system switch
    {
        null => DeviceKind.Unknown,
        "iPadOS" => DeviceKind.Tablet,
        "iOS" => DeviceKind.Phone,
        "Android" => userAgent.Contains("Mobile", StringComparison.Ordinal) ? DeviceKind.Phone : DeviceKind.Tablet,
        _ => DeviceKind.Desktop
    };
}

namespace MoviePicker.Api.Infrastructure.Web;

public static class OAuthProviders
{
    public const string Google = "google";
    public const string GitHub = "github";

    public static readonly IReadOnlyList<string> All = [Google, GitHub];

    public static bool IsKnown(string? provider) =>
        !string.IsNullOrWhiteSpace(provider) && All.Contains(provider, StringComparer.Ordinal);
}

public sealed class OAuthProviderCatalog
{
    private readonly HashSet<string> _enabled;

    public OAuthProviderCatalog(IConfiguration configuration)
    {
        _enabled = new HashSet<string>(StringComparer.Ordinal);

        if (HasCredentials(configuration, "OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET"))
            _enabled.Add(OAuthProviders.Google);

        if (HasCredentials(configuration, "OAUTH_GITHUB_CLIENT_ID", "OAUTH_GITHUB_CLIENT_SECRET"))
            _enabled.Add(OAuthProviders.GitHub);
    }

    public bool IsEnabled(string? provider) => provider is not null && _enabled.Contains(provider);

    public IReadOnlyCollection<string> Enabled => _enabled;

    internal static string? ReadCredential(IConfiguration configuration, string key)
    {
        var value = configuration[key]?.Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    private static bool HasCredentials(IConfiguration configuration, string idKey, string secretKey) =>
        ReadCredential(configuration, idKey) is not null && ReadCredential(configuration, secretKey) is not null;
}

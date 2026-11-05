using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Google;

public sealed partial class GoogleProfilePhotoSource : IGoogleProfilePhotoSource
{
    public const string HttpClientName = "google-profile-photo";

    private const string PeopleEndpoint = "https://people.googleapis.com/v1/people/me?personFields=photos";
    private const string PhotoHost = "googleusercontent.com";
    private const string PhotoSize = "=s256-c";

    internal static readonly TimeSpan Budget = TimeSpan.FromSeconds(5);

    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<GoogleProfilePhotoSource> _logger;
    private readonly TimeSpan _budget;

    public GoogleProfilePhotoSource(IHttpClientFactory httpFactory, ILogger<GoogleProfilePhotoSource> logger)
        : this(httpFactory, logger, Budget)
    {
    }

    internal GoogleProfilePhotoSource(IHttpClientFactory httpFactory, ILogger<GoogleProfilePhotoSource> logger, TimeSpan budget)
    {
        _httpFactory = httpFactory;
        _logger = logger;
        _budget = budget;
    }

    public async Task<byte[]?> FetchAsync(string accessToken, CancellationToken ct = default)
    {
        using var budget = CancellationTokenSource.CreateLinkedTokenSource(ct);
        budget.CancelAfter(_budget);
        var client = _httpFactory.CreateClient(HttpClientName);
        var photoUri = await FindPersonalPhotoAsync(client, accessToken, budget.Token);
        return photoUri is null ? null : await DownloadAsync(client, photoUri, budget.Token);
    }

    private async Task<Uri?> FindPersonalPhotoAsync(HttpClient client, string accessToken, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, PeopleEndpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google profile photo: the People API answered {StatusCode}", (int)response.StatusCode);
            return null;
        }

        try
        {
            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return FindPersonalPhotoUrl(payload.RootElement) is { } url ? ToSizedPhotoUri(url) : null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Google profile photo: the People API answered an unreadable payload");
            return null;
        }
    }

    private static string? FindPersonalPhotoUrl(JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Object
            || !payload.TryGetProperty("photos", out var photos)
            || photos.ValueKind != JsonValueKind.Array)
            return null;

        JsonElement? chosen = null;
        foreach (var photo in photos.EnumerateArray())
        {
            if (IsPrimary(photo))
            {
                chosen = photo;
                break;
            }
            chosen ??= photo;
        }

        if (chosen is not { } selected
            || (selected.TryGetProperty("default", out var isDefault) && isDefault.ValueKind == JsonValueKind.True)
            || !selected.TryGetProperty("url", out var url)
            || url.ValueKind != JsonValueKind.String)
            return null;
        return url.GetString();
    }

    private static bool IsPrimary(JsonElement photo) =>
        photo.TryGetProperty("metadata", out var metadata)
        && metadata.TryGetProperty("primary", out var primary)
        && primary.ValueKind == JsonValueKind.True;

    private static Uri? ToSizedPhotoUri(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !(string.Equals(uri.Host, PhotoHost, StringComparison.OrdinalIgnoreCase)
                || uri.Host.EndsWith("." + PhotoHost, StringComparison.OrdinalIgnoreCase)))
            return null;
        return new Uri(SizeSuffix().Replace(uri.GetLeftPart(UriPartial.Path), string.Empty) + PhotoSize);
    }

    private static async Task<byte[]?> DownloadAsync(HttpClient client, Uri photoUri, CancellationToken ct)
    {
        using var response = await client.GetAsync(photoUri, HttpCompletionOption.ResponseHeadersRead, ct);
        return response.IsSuccessStatusCode
            ? await response.Content.ReadAtMostAsync(AvatarPhotoImage.MaxBytes, ct)
            : null;
    }

    [GeneratedRegex("=[A-Za-z0-9-]+$")]
    private static partial Regex SizeSuffix();
}

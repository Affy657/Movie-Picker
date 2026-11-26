using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class HttpWebShellSource : IWebShellSource
{
    public const string HttpClientName = "web-shell";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<HttpWebShellSource> _logger;
    private readonly Lock _gate = new();
    private Task<string?>? _inFlight;

    public HttpWebShellSource(
        IHttpClientFactory httpClientFactory,
        IOptions<MoviePickerOptions> options,
        ILogger<HttpWebShellSource> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public Task<string?> GetShellAsync(CancellationToken ct = default)
    {
        Task<string?> fetch;
        lock (_gate)
        {
            if (_inFlight is null || _inFlight.IsCompleted)
                _inFlight = FetchAsync();
            fetch = _inFlight;
        }

        return fetch.WaitAsync(ct);
    }

    private async Task<string?> FetchAsync()
    {
        var url = $"{_options.ResolvedWebBaseUrl()}/index.html";
        try
        {
            using var response = await _httpClientFactory.CreateClient(HttpClientName).GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Web shell unavailable: {Url} answered {Status}", url, (int)response.StatusCode);
                return null;
            }

            var html = await response.Content.ReadAsStringAsync();
            if (html.Contains("id=\"root\"", StringComparison.Ordinal))
                return html;

            _logger.LogWarning("Web shell unavailable: {Url} did not answer the application shell", url);
            return null;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Web shell unavailable: {Url}", url);
            return null;
        }
    }
}

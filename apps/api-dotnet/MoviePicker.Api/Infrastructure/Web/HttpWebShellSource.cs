using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class HttpWebShellSource : IWebShellSource
{
    public const string HttpClientName = "web-shell";
    private const string CacheKey = "web-shell:index.html";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<HttpWebShellSource> _logger;
    private readonly object _gate = new();
    private Task<string?>? _inFlight;

    public HttpWebShellSource(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        IOptions<MoviePickerOptions> options,
        ILogger<HttpWebShellSource> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string?> GetShellAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out string? cached) && cached is not null)
            return cached;

        Task<string?> fetch;
        lock (_gate)
        {
            _inFlight ??= FetchAsync();
            fetch = _inFlight;
        }

        try
        {
            return await fetch.WaitAsync(ct);
        }
        finally
        {
            lock (_gate)
            {
                if (ReferenceEquals(_inFlight, fetch) && fetch.IsCompleted)
                    _inFlight = null;
            }
        }
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
            if (!html.Contains("id=\"root\"", StringComparison.Ordinal))
            {
                _logger.LogWarning("Web shell unavailable: {Url} did not answer the application shell", url);
                return null;
            }

            _cache.Set(CacheKey, html, CacheTtl);
            return html;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Web shell unavailable: {Url}", url);
            return null;
        }
    }
}

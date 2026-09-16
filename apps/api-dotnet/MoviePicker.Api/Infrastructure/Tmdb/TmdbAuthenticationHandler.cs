using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbAuthenticationHandler : DelegatingHandler
{
    private readonly IOptions<MoviePickerOptions> _options;

    public TmdbAuthenticationHandler(IOptions<MoviePickerOptions> options)
    {
        _options = options;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var options = _options.Value;
        if (!string.IsNullOrWhiteSpace(options.TmdbReadAccessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.TmdbReadAccessToken);
        else if (!string.IsNullOrWhiteSpace(options.TmdbApiKey) && request.RequestUri is { } uri)
            request.RequestUri = WithApiKey(uri, options.TmdbApiKey);

        return base.SendAsync(request, cancellationToken);
    }

    private static Uri WithApiKey(Uri uri, string apiKey)
    {
        var existing = uri.Query.TrimStart('?');
        var credential = $"api_key={Uri.EscapeDataString(apiKey)}";
        return new UriBuilder(uri) { Query = existing.Length == 0 ? credential : $"{existing}&{credential}" }.Uri;
    }
}

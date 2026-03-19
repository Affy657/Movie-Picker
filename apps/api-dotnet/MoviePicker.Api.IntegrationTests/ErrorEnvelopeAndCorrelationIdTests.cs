using System.Net;
using System.Text.Json;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

/// <summary>§ 29 roadmap : enveloppe JSON + en-tête X-Request-Id.</summary>
public sealed class ErrorEnvelopeAndCorrelationIdTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly HttpClient _client;

    public ErrorEnvelopeAndCorrelationIdTests(MoviePickerApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task NoMatchingEndpoint_404_StatusCodePage_UsesStandardEnvelope()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/no-endpoint-404-xyz");
        request.Headers.Add("X-Request-Id", "client-req-abc-01");
        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.True(res.Headers.TryGetValues("X-Request-Id", out var ids));
        Assert.Equal("client-req-abc-01", ids.First());

        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Ressource introuvable", json.GetProperty("error").GetString());
        Assert.Equal(404, json.GetProperty("code").GetInt32());
        Assert.Equal("client-req-abc-01", json.GetProperty("requestId").GetString());
    }

    [Fact]
    public async Task BusinessNotFound_404_ExceptionFilter_UsesSameEnvelope_WithGeneratedRequestId()
    {
        var res = await _client.GetAsync("/api/v1/events/slug/absent-slug-999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.True(res.Headers.TryGetValues("X-Request-Id", out var headerIds));
        var headerId = headerIds.First();
        Assert.False(string.IsNullOrEmpty(headerId));

        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Soirée introuvable", json.GetProperty("error").GetString());
        Assert.Equal(404, json.GetProperty("code").GetInt32());
        Assert.Equal(headerId, json.GetProperty("requestId").GetString());
    }
}

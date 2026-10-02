using System.Net;
using System.Text;
using System.Text.Json;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class KestrelRequestBodyLimitTests : IDisposable
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    private readonly MoviePickerApplicationFactory _factory = new();

    public KestrelRequestBodyLimitTests() => _factory.UseKestrel(0);

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task LetterboxdConfirmAboveTheDefaultBodyLimit_Answers413RequestTooLarge()
    {
        using var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "GrosseListe");
        var selections = Enumerable.Range(1, 5_000)
            .Select(tmdbId => new AddWatchlistItemRequest { TmdbId = tmdbId, Title = new string('t', 200), Year = "2001" })
            .ToList();
        var json = JsonSerializer.Serialize(new LetterboxdImportConfirmRequest { Selections = selections }, WebJson);
        Assert.True(Encoding.UTF8.GetByteCount(json) > RequestBodyLimits.DefaultBytes);

        using var res = await client.PostAsync(
            "/api/v1/letterboxd/confirm",
            new StringContent(json, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        using var error = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal("request_too_large", error.RootElement.GetProperty("reason").GetString());
        Assert.Equal(413, error.RootElement.GetProperty("code").GetInt32());
    }
}

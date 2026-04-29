using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Email;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Email;

public class ResendEmailSenderTests
{
    private static MoviePickerOptions OptionsWith(string apiKey = "re_test_key", string from = "noreply@movie-picker.fr", string fromName = "Movie Picker", string baseUrl = "https://api.resend.com")
        => new()
        {
            ResendApiKey = apiKey,
            EmailFromAddress = from,
            EmailFromName = fromName,
            ResendApiBaseUrl = baseUrl,
        };

    private static EmailMessage SampleMessage(string? tag = "password-reset")
        => new("alice@example.com", "Alice", "Test subject", "<p>html</p>", "text", tag);

    [Fact]
    public async Task SendAsync_HappyPath_PostsResendEmailEndpointWithBearerAndExpectedBody()
    {
        HttpRequestMessage? captured = null;
        string? capturedBody = null;
        var handler = new RecordingHandler(async (req, _) =>
        {
            captured = req;
            capturedBody = await (req.Content?.ReadAsStringAsync() ?? Task.FromResult(string.Empty));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new { id = "re_msg_1" })
            };
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendEmailSender(http, Options.Create(OptionsWith()), NullLogger<ResendEmailSender>.Instance);

        await sender.SendAsync(SampleMessage());

        Assert.NotNull(captured);
        Assert.Equal(HttpMethod.Post, captured!.Method);
        Assert.Equal("/emails", captured.RequestUri!.PathAndQuery);
        Assert.Equal("Bearer", captured.Headers.Authorization?.Scheme);
        Assert.Equal("re_test_key", captured.Headers.Authorization?.Parameter);

        Assert.NotNull(capturedBody);
        using var doc = JsonDocument.Parse(capturedBody!);
        var root = doc.RootElement;
        Assert.Equal("Movie Picker <noreply@movie-picker.fr>", root.GetProperty("from").GetString());
        Assert.Equal("alice@example.com", root.GetProperty("to")[0].GetString());
        Assert.Equal("Test subject", root.GetProperty("subject").GetString());
        Assert.Equal("<p>html</p>", root.GetProperty("html").GetString());
        Assert.Equal("text", root.GetProperty("text").GetString());
        // tags : [{ name: "category", value: "password-reset" }]
        var tag = root.GetProperty("tags")[0];
        Assert.Equal("category", tag.GetProperty("name").GetString());
        Assert.Equal("password-reset", tag.GetProperty("value").GetString());
    }

    [Fact]
    public async Task SendAsync_NullTag_OmitsTagsArray()
    {
        string? capturedBody = null;
        var handler = new RecordingHandler(async (req, _) =>
        {
            capturedBody = await (req.Content?.ReadAsStringAsync() ?? Task.FromResult(string.Empty));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { id = "x" }) };
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendEmailSender(http, Options.Create(OptionsWith()), NullLogger<ResendEmailSender>.Instance);

        await sender.SendAsync(SampleMessage(tag: null));

        using var doc = JsonDocument.Parse(capturedBody!);
        // tags absent OU array vide selon ton choix d'impl ; test sur les 2
        var hasTags = doc.RootElement.TryGetProperty("tags", out var tags);
        if (hasTags) Assert.Equal(0, tags.GetArrayLength());
    }

    [Fact]
    public async Task SendAsync_400_ThrowsEmailDeliveryException()
    {
        var handler = new RecordingHandler((req, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("{\"message\":\"Invalid from address\"}", System.Text.Encoding.UTF8, "application/json")
        }));
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendEmailSender(http, Options.Create(OptionsWith()), NullLogger<ResendEmailSender>.Instance);

        var ex = await Assert.ThrowsAsync<EmailDeliveryException>(() => sender.SendAsync(SampleMessage()));
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task SendAsync_401_ThrowsEmailDeliveryException()
    {
        var handler = new RecordingHandler((req, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized)));
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendEmailSender(http, Options.Create(OptionsWith()), NullLogger<ResendEmailSender>.Instance);

        var ex = await Assert.ThrowsAsync<EmailDeliveryException>(() => sender.SendAsync(SampleMessage()));
        Assert.Equal(401, ex.StatusCode);
    }

    [Fact]
    public async Task SendAsync_429_ThrowsEmailDeliveryExceptionAfterRetry()
    {
        // Le sender peut faire 1 retry court sur 429 puis lever ; ici on renvoie 429 deux fois.
        var calls = 0;
        var handler = new RecordingHandler((req, _) =>
        {
            calls++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests));
        });
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendEmailSender(http, Options.Create(OptionsWith()), NullLogger<ResendEmailSender>.Instance);

        var ex = await Assert.ThrowsAsync<EmailDeliveryException>(() => sender.SendAsync(SampleMessage()));
        Assert.Equal(429, ex.StatusCode);
        Assert.True(calls >= 1, "expected at least 1 attempt; retry behavior is implementation-defined");
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _fn;
        public RecordingHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> fn) => _fn = fn;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => _fn(request, cancellationToken);
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Email;

public sealed class ResendEmailSender : IEmailSender
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(200);

    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(HttpClient http, IOptions<MoviePickerOptions> options, ILogger<ResendEmailSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var payload = BuildPayload(message);

        var attempt = 0;
        HttpResponseMessage? res = null;
        while (true)
        {
            attempt++;
            using var req = new HttpRequestMessage(HttpMethod.Post, "/emails")
            {
                Content = JsonContent.Create(payload)
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ResendApiKey);

            HttpResponseMessage response;
            try
            {
                response = await _http.SendAsync(req, ct);
            }
            catch (HttpRequestException ex)
            {
                throw new EmailDeliveryException($"HTTP error sending email: {ex.Message}", inner: ex);
            }
            catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
            {
                throw new EmailDeliveryException("Timeout sending email", inner: ex);
            }

            res = response;

            if (res.StatusCode == HttpStatusCode.TooManyRequests && attempt == 1)
            {
                res.Dispose();
                await Task.Delay(RetryDelay, ct);
                continue;
            }
            break;
        }

        try
        {
            if (!res!.IsSuccessStatusCode)
            {
                var status = (int)res.StatusCode;
                string body;
                try { body = await res.Content.ReadAsStringAsync(ct); }
                catch { body = "<unreadable>"; }
                _logger.LogWarning("Resend send failed status={Status} tag={Tag} body={Body}",
                    status, message.Tag ?? "n/a", Truncate(body, 256));
                throw new EmailDeliveryException(
                    $"Resend returned {status}",
                    statusCode: status);
            }

            _logger.LogInformation("EmailSent tag={Tag} to_masked={ToMasked} status={Status}",
                message.Tag ?? "n/a", EmailMasking.Mask(message.ToEmail), (int)res.StatusCode);
        }
        finally
        {
            res!.Dispose();
        }
    }

    private object BuildPayload(EmailMessage message)
    {
        var from = $"{_options.EmailFromName} <{_options.EmailFromAddress}>";
        if (message.Tag is null)
        {
            return new
            {
                from,
                to = new[] { message.ToEmail },
                subject = message.Subject,
                html = message.HtmlBody,
                text = message.TextBody,
            };
        }
        return new
        {
            from,
            to = new[] { message.ToEmail },
            subject = message.Subject,
            html = message.HtmlBody,
            text = message.TextBody,
            tags = new[] { new { name = "category", value = message.Tag } }
        };
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

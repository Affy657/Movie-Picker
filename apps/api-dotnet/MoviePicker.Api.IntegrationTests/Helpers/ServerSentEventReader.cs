using System.Text;

namespace MoviePicker.Api.IntegrationTests.Helpers;

internal sealed record ServerSentEvent(string Name, string Data);

internal sealed class ServerSentEventReader : IDisposable
{
    private readonly HttpResponseMessage _response;
    private readonly StreamReader _reader;

    private ServerSentEventReader(HttpResponseMessage response, Stream body)
    {
        _response = response;
        _reader = new StreamReader(body, Encoding.UTF8);
    }

    public HttpResponseMessage Response => _response;

    public static async Task<ServerSentEventReader> OpenAsync(HttpClient client, string url, string? acceptEncoding = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.ParseAdd("text/event-stream");
        if (acceptEncoding is not null)
            request.Headers.AcceptEncoding.ParseAdd(acceptEncoding);
        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        var body = await response.Content.ReadAsStreamAsync();
        return new ServerSentEventReader(response, body);
    }

    public async Task<ServerSentEvent> WaitForAsync(
        string name,
        Func<string, bool>? matches = null,
        TimeSpan? within = null)
    {
        using var timeout = new CancellationTokenSource(within ?? TimeSpan.FromSeconds(10));
        while (true)
        {
            var next = await NextAsync(timeout.Token);
            if (next.Name == name && (matches is null || matches(next.Data)))
                return next;
        }
    }

    private async Task<ServerSentEvent> NextAsync(CancellationToken ct)
    {
        var name = "message";
        var data = new StringBuilder();
        while (true)
        {
            var line = await _reader.ReadLineAsync(ct)
                ?? throw new EndOfStreamException("The event stream ended.");
            if (line.Length == 0)
            {
                if (data.Length > 0)
                    return new ServerSentEvent(name, data.ToString());
                name = "message";
                continue;
            }

            if (line.StartsWith("event:", StringComparison.Ordinal))
                name = line["event:".Length..].Trim();
            else if (line.StartsWith("data:", StringComparison.Ordinal))
                data.Append(line["data:".Length..].TrimStart());
        }
    }

    public void Dispose()
    {
        _reader.Dispose();
        _response.Dispose();
    }
}

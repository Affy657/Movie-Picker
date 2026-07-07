using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.IntegrationTests.Helpers;

public sealed class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentBag<EmailMessage> _sent = [];

    public ConcurrentBag<EmailMessage> SentMessages => _sent;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        SentMessages.Add(message);
        return Task.CompletedTask;
    }

    public void Clear()
    {
        while (_sent.TryTake(out _)) { }
    }
}

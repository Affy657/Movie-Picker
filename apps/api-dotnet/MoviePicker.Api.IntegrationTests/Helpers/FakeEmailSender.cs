using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.IntegrationTests.Helpers;

/// <summary>Test double singleton qui capte les emails au lieu de les envoyer.</summary>
public sealed class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentBag<EmailMessage> _sent = new();

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

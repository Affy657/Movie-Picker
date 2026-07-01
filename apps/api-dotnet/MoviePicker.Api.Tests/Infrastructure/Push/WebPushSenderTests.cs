using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Push;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Push;

public sealed class WebPushSenderTests
{
    private static readonly PushSubscription Subscription = new()
    {
        UserId = "u1",
        Endpoint = "https://push.example.com/abc",
        P256dh = "key",
        Auth = "auth"
    };

    private static readonly PushMessage Message = new("Titre", "Corps");

    private static WebPushSender Build(string? publicKey, string? privateKey) =>
        new(
            Options.Create(new MoviePickerOptions { VapidPublicKey = publicKey, VapidPrivateKey = privateKey }),
            NullLogger<WebPushSender>.Instance);

    [Fact]
    public async Task SendAsync_NoVapidKeys_NoOps()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, null).SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_OnlyPublicKey_NoOps()
    {
        var ex = await Record.ExceptionAsync(() => Build("pub", null).SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_OnlyPrivateKey_NoOps()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, "priv").SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_BlankKeys_NoOps()
    {
        var ex = await Record.ExceptionAsync(() => Build("   ", "   ").SendAsync(Subscription, Message));

        Assert.Null(ex);
    }
}

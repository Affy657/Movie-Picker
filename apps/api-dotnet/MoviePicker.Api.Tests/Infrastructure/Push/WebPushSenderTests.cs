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
        P256dh = "not-a-valid-key",
        Auth = "not-a-valid-auth",
    };

    private static readonly PushMessage Message = new("Titre", "Corps", Tag: "evt-1", Url: "/e/1");

    private static WebPushSender Build(string? publicKey, string? privateKey) =>
        new(
            Options.Create(
                new MoviePickerOptions { VapidPublicKey = publicKey, VapidPrivateKey = privateKey }
            ),
            NullLogger<WebPushSender>.Instance
        );

    [Fact]
    public async Task SendAsync_SansCleVapid_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, null).SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClePubliqueSeule_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build("pub", null).SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClePriveeSeule_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, "priv").SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClesVides_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build("   ", "   ").SendAsync(Subscription, Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_AvecClesMaisAbonnementInvalide_AvaleLException()
    {
        var keys = WebPush.VapidHelper.GenerateVapidKeys();

        var ex = await Record.ExceptionAsync(
            () => Build(keys.PublicKey, keys.PrivateKey).SendAsync(Subscription, Message)
        );

        Assert.Null(ex);
    }
}

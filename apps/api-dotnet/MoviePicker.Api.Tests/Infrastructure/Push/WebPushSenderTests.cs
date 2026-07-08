using System.Net;
using System.Security.Cryptography;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Push;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Push;

public sealed class WebPushSenderTests : IDisposable
{
    private static readonly PushMessage Message = new("Titre", "Corps", Tag: "evt-1", Url: "/e/1");

    private readonly InMemoryPushSubscriptionRepository _repository = new();
    private readonly ServiceProvider _provider;

    public WebPushSenderTests()
    {
        var services = new ServiceCollection();
        services.AddScoped<IPushSubscriptionRepository>(_ => _repository);
        _provider = services.BuildServiceProvider();
    }

    public void Dispose() => _provider.Dispose();

    private IServiceScopeFactory ScopeFactory =>
        _provider.GetRequiredService<IServiceScopeFactory>();

    private WebPushSender Build(string? publicKey, string? privateKey) =>
        new(
            Options.Create(
                new MoviePickerOptions { VapidPublicKey = publicKey, VapidPrivateKey = privateKey }
            ),
            ScopeFactory,
            NullLogger<WebPushSender>.Instance
        );

    private static PushSubscription Subscription(string p256dh = "not-a-valid-key") =>
        new()
        {
            UserId = "u1",
            Endpoint = "https://push.example.com/abc",
            P256dh = p256dh,
            Auth = "not-a-valid-auth",
            CreatedAt = DateTimeOffset.UtcNow,
        };

    [Fact]
    public async Task SendAsync_SansCleVapid_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, null).SendAsync(Subscription(), Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClePubliqueSeule_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build("pub", null).SendAsync(Subscription(), Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClePriveeSeule_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build(null, "priv").SendAsync(Subscription(), Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_ClesVides_NeFaitRien()
    {
        var ex = await Record.ExceptionAsync(() => Build("   ", "   ").SendAsync(Subscription(), Message));

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_AvecClesMaisAbonnementInvalide_AvaleLException()
    {
        var keys = WebPush.VapidHelper.GenerateVapidKeys();

        var ex = await Record.ExceptionAsync(
            () => Build(keys.PublicKey, keys.PrivateKey).SendAsync(Subscription(), Message)
        );

        Assert.Null(ex);
    }

    [Fact]
    public async Task SendAsync_AbonnementExpire410_PurgeLAbonnement()
    {
        var subscription = Subscription(GenerateClientPublicKey());
        await _repository.UpsertAsync(subscription);

        var keys = WebPush.VapidHelper.GenerateVapidKeys();
        var sender = Build(keys.PublicKey, keys.PrivateKey);
        sender.HttpClientOverride = new HttpClient(new GoneHandler());

        await sender.SendAsync(subscription, Message);

        Assert.Empty(await _repository.ListByUserIdAsync(subscription.UserId));
    }

    private static string GenerateClientPublicKey()
    {
        using var ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        var parameters = ecdh.ExportParameters(false);
        var raw = new byte[65];
        raw[0] = 0x04;
        CopyRightAligned(parameters.Q.X!, raw, 1);
        CopyRightAligned(parameters.Q.Y!, raw, 33);
        return Base64UrlEncode(raw);
    }

    private static void CopyRightAligned(byte[] source, byte[] destination, int offset)
    {
        Buffer.BlockCopy(source, 0, destination, offset + (32 - source.Length), source.Length);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed class GoneHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Gone));
    }
}

using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class SubscribePushHandlerTests
{
    [Fact]
    public async Task HandleAsync_UpsertsSubscriptionForUser()
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new SubscribePushHandler(subs.Object, TimeProvider.System);
        var request = new SubscribePushRequest { Endpoint = "https://fcm.googleapis.com/fcm/send/abc", P256dh = "key", Auth = "auth" };

        await sut.HandleAsync("u1", request);

        subs.Verify(s => s.UpsertAsync(
            It.Is<PushSubscription>(x => x.UserId == "u1" && x.Endpoint == "https://fcm.googleapis.com/fcm/send/abc" && x.P256dh == "key" && x.Auth == "auth"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("http://push.example/abc")]
    [InlineData("https://127.0.0.1/abc")]
    [InlineData("https://[::1]/abc")]
    [InlineData("https://10.0.0.7/abc")]
    [InlineData("https://localhost/abc")]
    [InlineData("https://169.254.169.254/computeMetadata/v1/")]
    [InlineData("https://push.example/abc")]
    [InlineData("https://collect.attacker.example/v")]
    [InlineData("https://fcm.googleapis.com.attacker.example/fcm/send/abc")]
    [InlineData("https://notfcm.googleapis.com/fcm/send/abc")]
    [InlineData("https://metadata.google.internal/computeMetadata/v1/")]
    [InlineData("http://fcm.googleapis.com/fcm/send/abc")]
    [InlineData("https://fcm.googleapis.com:8443/fcm/send/abc")]
    [InlineData("https://fcm.googleapis.com@collect.attacker.example/abc")]
    [InlineData("https://someone@fcm.googleapis.com/fcm/send/abc")]
    public async Task HandleAsync_RejectsEndpointsOutsideTheKnownPushServices(string endpoint)
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new SubscribePushHandler(subs.Object, TimeProvider.System);
        var request = new SubscribePushRequest { Endpoint = endpoint, P256dh = "key", Auth = "auth" };

        await Assert.ThrowsAsync<BadRequestException>(() => sut.HandleAsync("u1", request));

        subs.Verify(s => s.UpsertAsync(It.IsAny<PushSubscription>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("https://fcm.googleapis.com/fcm/send/abc")]
    [InlineData("https://fcm.googleapis.com/wp/abc")]
    [InlineData("https://updates.push.services.mozilla.com/wpush/v2/abc")]
    [InlineData("https://web.push.apple.com/abc")]
    [InlineData("https://wns2-par02p.notify.windows.com/w/?token=abc")]
    [InlineData("https://FCM.googleapis.com/fcm/send/abc")]
    public async Task HandleAsync_AcceptsTheKnownPushServices(string endpoint)
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new SubscribePushHandler(subs.Object, TimeProvider.System);
        var request = new SubscribePushRequest { Endpoint = endpoint, P256dh = "key", Auth = "auth" };

        await sut.HandleAsync("u1", request);

        subs.Verify(s => s.UpsertAsync(It.Is<PushSubscription>(x => x.Endpoint == endpoint), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public sealed class UnsubscribePushHandlerTests
{
    [Fact]
    public async Task HandleAsync_DeletesByEndpoint()
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new UnsubscribePushHandler(subs.Object);

        await sut.HandleAsync("u1", "https://push.example/abc");

        subs.Verify(s => s.DeleteByEndpointAsync("u1", "https://push.example/abc", It.IsAny<CancellationToken>()), Times.Once);
    }
}

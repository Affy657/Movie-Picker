using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class SubscribePushHandlerTests
{
    [Fact]
    public async Task HandleAsync_UpsertsSubscriptionForUser()
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new SubscribePushHandler(subs.Object, TimeProvider.System);
        var request = new SubscribePushRequest { Endpoint = "https://push/abc", P256dh = "key", Auth = "auth" };

        await sut.HandleAsync("u1", request);

        subs.Verify(s => s.UpsertAsync(
            It.Is<PushSubscription>(x => x.UserId == "u1" && x.Endpoint == "https://push/abc" && x.P256dh == "key" && x.Auth == "auth"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}

public sealed class UnsubscribePushHandlerTests
{
    [Fact]
    public async Task HandleAsync_DeletesByEndpoint()
    {
        var subs = new Mock<IPushSubscriptionRepository>();
        var sut = new UnsubscribePushHandler(subs.Object);

        await sut.HandleAsync("u1", "https://push/abc");

        subs.Verify(s => s.DeleteByEndpointAsync("u1", "https://push/abc", It.IsAny<CancellationToken>()), Times.Once);
    }
}

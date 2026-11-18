using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class NotificationsControllerTests
{
    private static NotificationsController Controller(string? userId) =>
        new NotificationsController().WithContext(
            userId is null ? null : ControllerTestHelpers.AuthenticatedUser(userId));

    [Fact]
    public void GetVapidPublicKey_ReturnsConfiguredKey()
    {
        var result = Controller(null).GetVapidPublicKey(
            Options.Create(new MoviePickerOptions { VapidPublicKey = "pub-key" }));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("pub-key", ok.Value!.ToString());
    }

    [Fact]
    public void GetVapidPublicKey_NullKey_StillReturnsOk()
    {
        var result = Controller(null).GetVapidPublicKey(Options.Create(new MoviePickerOptions()));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Subscribe_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<ISubscribePushHandler>();
        var request = new SubscribePushRequest { Endpoint = "https://push/x", P256dh = "k", Auth = "a" };

        var result = await Controller("u1").Subscribe(request, handler.Object, "u1", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", request, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Unsubscribe_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IUnsubscribePushHandler>();
        var request = new UnsubscribePushRequest { Endpoint = "https://push/x" };

        var result = await Controller("u1").Unsubscribe(request, handler.Object, "u1", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", "https://push/x", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPreferences_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IGetNotificationPreferencesHandler>();

        var result = await Controller("u1").GetPreferences(handler.Object, "u1", CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PatchPreferences_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IPatchNotificationPreferencesHandler>();
        var request = new PatchNotificationPreferencesRequest();

        var result = await Controller("u1").PatchPreferences(request, handler.Object, "u1", CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", request, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetInbox_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IGetInboxHandler>();

        var result = await Controller("u1").GetInbox(handler.Object, null, null, "u1", CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", null, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MarkAllRead_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IMarkAllReadHandler>();

        var result = await Controller("u1").MarkAllRead(handler.Object, "u1", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", It.IsAny<CancellationToken>()), Times.Once);
    }
}

using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteEvent;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Application.UseCases.EventSharePreview;
using MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.InviteUser;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.RemoveParticipant;
using MoviePicker.Api.Application.UseCases.ResetWheel;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class EventsControllerTests
{
    private static EventsController Controller(string? userId) =>
        new EventsController().WithContext(
            userId is null ? null : ControllerTestHelpers.AuthenticatedUser(userId));

    [Fact]
    public async Task Create_Authenticated_ReturnsCreatedAtAction()
    {
        var handler = new Mock<ICreateEventHandler>();
        handler.Setup(h => h.HandleAsync(It.IsAny<CreateEventRequest>(), "u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreateEventResponse { Slug = "soiree-x" });

        var result = await Controller("u1").Create(null!, handler.Object, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(EventsController.GetBySlug), created.ActionName);
    }

    [Fact]
    public async Task Create_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).Create(null!, new Mock<ICreateEventHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task ListMine_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IListMyEventsHandler>();

        var result = await Controller("u1").ListMine(handler.Object, null, null, null, null, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", null, null, null, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListMine_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).ListMine(
            new Mock<IListMyEventsHandler>().Object, null, null, null, null, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetConfig_ReturnsOk()
    {
        var handler = new Mock<IGetEventConfigHandler>();

        var result = await Controller(null).GetConfig("e", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PatchConfig_ReturnsOk()
    {
        var handler = new Mock<IPatchEventConfigHandler>();

        var result = await Controller(null).PatchConfig("e", null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetSharePreview_ReturnsHtmlContent_WithCacheHeader()
    {
        var handler = new Mock<IGetEventSharePreviewHtmlHandler>();
        handler.Setup(h => h.BuildHtmlAsync("e", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("<html></html>");
        var controller = Controller(null);

        var result = await controller.GetSharePreview("e", handler.Object, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal("<html></html>", content.Content);
        Assert.Equal("text/html; charset=utf-8", content.ContentType);
        Assert.Equal("public, max-age=120", controller.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task GetBySlug_ReturnsOk()
    {
        var handler = new Mock<IGetEventDetailHandler>();

        var result = await Controller(null).GetBySlug("e", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Join_NewParticipant_ReturnsCreated()
    {
        var handler = new Mock<IJoinEventHandler>();
        handler.Setup(h => h.HandleAsync("e", It.IsAny<JoinEventRequest>(), "u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new JoinEventResult { IsNew = true });

        var result = await Controller("u1").Join("e", null!, handler.Object, CancellationToken.None);

        Assert.IsType<CreatedResult>(result);
    }

    [Fact]
    public async Task Join_ExistingParticipant_ReturnsOk()
    {
        var handler = new Mock<IJoinEventHandler>();
        handler.Setup(h => h.HandleAsync("e", It.IsAny<JoinEventRequest>(), "u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new JoinEventResult { IsNew = false });

        var result = await Controller("u1").Join("e", null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Join_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).Join("e", null!, new Mock<IJoinEventHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Wheel_ReturnsOk()
    {
        var handler = new Mock<ILaunchWheelHandler>();

        var result = await Controller(null).Wheel("e", new CsrfGuardRequest(), handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResetWheel_ReturnsOk()
    {
        var handler = new Mock<IResetWheelHandler>();

        var result = await Controller(null).ResetWheel("e", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Close_ReturnsOk()
    {
        var handler = new Mock<ICloseEventHandler>();

        var result = await Controller(null).Close("e", new CsrfGuardRequest(), handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task RemoveParticipant_ReturnsOk()
    {
        var handler = new Mock<IRemoveParticipantHandler>();

        var result = await Controller(null).RemoveParticipant("e", "p1", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", "p1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetEligibleFollows_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IGetEligibleFollowsForEventHandler>();

        var result = await Controller("u1").GetEligibleFollows("e", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetEligibleFollows_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).GetEligibleFollows(
            "e", new Mock<IGetEligibleFollowsForEventHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task SendInvitation_Authenticated_ReturnsCreated()
    {
        var handler = new Mock<IInviteUserHandler>();

        var result = await Controller("u1").SendInvitation("e", null!, handler.Object, CancellationToken.None);

        Assert.IsType<CreatedResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<InviteUserRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendInvitation_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).SendInvitation(
            "e", null!, new Mock<IInviteUserHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Delete_Authenticated_ReturnsOk()
    {
        var handler = new Mock<IDeleteEventHandler>();

        var result = await Controller("u1").Delete("e", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<CancellationToken>()), Times.Once);
    }
}

using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.UseCases.EventInvitation;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class EventInvitationControllerTests
{
    private readonly Mock<IGetEventInvitationDocumentHandler> _handler = new();
    private readonly EventInvitationController _sut = new EventInvitationController().WithContext();

    public EventInvitationControllerTests()
    {
        _sut.Request.Scheme = "https";
        _sut.Request.Host = new Microsoft.AspNetCore.Http.HostString("api.example");
        _sut.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    public async Task Get_ServesTheDocumentOfTheHandlerWithTheSiteHeaders(int status)
    {
        _handler.Setup(h => h.HandleAsync("Ab3dE_9xYz", "https://api.example", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShareDocument(status, "<html><div id=\"root\"></div></html>"));

        var result = await _sut.Get("Ab3dE_9xYz", _handler.Object, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(status, content.StatusCode);
        Assert.Equal("text/html; charset=utf-8", content.ContentType);
        Assert.Contains("id=\"root\"", content.Content);
        Assert.Equal("public, max-age=60", _sut.Response.Headers.CacheControl.ToString());
        Assert.Equal("frame-ancestors 'none'", _sut.Response.Headers.ContentSecurityPolicy.ToString());
        Assert.Equal("strict-origin-when-cross-origin", _sut.Response.Headers["Referrer-Policy"].ToString());
    }
}

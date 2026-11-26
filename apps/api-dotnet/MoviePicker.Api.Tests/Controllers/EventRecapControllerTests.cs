using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.UseCases.EventRecap;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class EventRecapControllerTests
{
    private static readonly IOptions<MoviePickerOptions> PublicApi =
        Options.Create(new MoviePickerOptions { PublicApiBaseUrl = "https://api.example/" });

    private readonly Mock<IGetEventRecapDocumentHandler> _handler = new();
    private readonly EventRecapController _sut = new EventRecapController().WithContext();

    public EventRecapControllerTests()
    {
        _sut.Request.Scheme = "https";
        _sut.Request.Host = new Microsoft.AspNetCore.Http.HostString("service-hash-ew.a.run.app");
        _sut.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
        _sut.Response.Headers["Referrer-Policy"] = "no-referrer";
        _sut.Response.Headers.CacheControl = "no-store";
    }

    private void Document(int status, string html = "<html><div id=\"root\"></div></html>") =>
        _handler.Setup(h => h.HandleAsync("abc", "https://api.example", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShareDocument(status, html));

    [Fact]
    public async Task Get_KnownNight_ServesTheDocumentAsHtmlWithTheSiteHeaders()
    {
        Document(200, "<html><head><title>Soirée, le recap</title></head></html>");

        var result = await _sut.Get("abc", _handler.Object, PublicApi, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(200, content.StatusCode);
        Assert.Equal("text/html; charset=utf-8", content.ContentType);
        Assert.Contains("Soirée, le recap", content.Content);
        Assert.Equal("public, max-age=60", _sut.Response.Headers.CacheControl.ToString());
        Assert.Equal("frame-ancestors 'none'", _sut.Response.Headers.ContentSecurityPolicy.ToString());
        Assert.Equal("strict-origin-when-cross-origin", _sut.Response.Headers["Referrer-Policy"].ToString());
    }

    [Fact]
    public async Task Get_UnknownNight_Keeps404WithTheDocument()
    {
        Document(404);

        var result = await _sut.Get("abc", _handler.Object, PublicApi, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(404, content.StatusCode);
        Assert.Contains("id=\"root\"", content.Content);
        Assert.Equal("public, max-age=60", _sut.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task Get_PassesThePublicApiOriginToTheHandler()
    {
        Document(200);

        await _sut.Get("abc", _handler.Object, PublicApi, CancellationToken.None);

        _handler.Verify(h => h.HandleAsync("abc", "https://api.example", It.IsAny<CancellationToken>()), Times.Once);
    }
}

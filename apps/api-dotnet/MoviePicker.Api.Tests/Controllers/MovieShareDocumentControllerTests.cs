using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.UseCases.MovieShare;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MovieShareDocumentControllerTests
{
    private static readonly string[] SharedDocumentPolicies =
        [RateLimitingExtensions.MovieDocumentPolicy, RateLimitingExtensions.MovieDocumentCeilingPolicy];

    private readonly Mock<IGetMovieShareDocumentHandler> _handler = new();
    private readonly MovieShareDocumentController _sut = new MovieShareDocumentController().WithContext();

    public MovieShareDocumentControllerTests()
    {
        _sut.Request.Scheme = "https";
        _sut.Request.Host = new Microsoft.AspNetCore.Http.HostString("api.example");
        _sut.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    }

    private void GivenDocument(string movieRef, MovieMediaType mediaType, int status) =>
        _handler.Setup(h => h.HandleAsync(movieRef, mediaType, "https://api.example", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShareDocument(status, $"<html><div id=\"root\"></div>{mediaType}</html>"));

    private void AssertServedWithTheSiteHeaders(IActionResult result, int status, MovieMediaType mediaType)
    {
        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(status, content.StatusCode);
        Assert.Equal("text/html; charset=utf-8", content.ContentType);
        Assert.Contains(mediaType.ToString(), content.Content);
        Assert.Equal("public, max-age=60", _sut.Response.Headers.CacheControl.ToString());
        Assert.Equal("frame-ancestors 'none'", _sut.Response.Headers.ContentSecurityPolicy.ToString());
        Assert.Equal("strict-origin-when-cross-origin", _sut.Response.Headers["Referrer-Policy"].ToString());
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    public async Task GetFilm_ServesTheFilmDocumentOfTheHandler(int status)
    {
        GivenDocument("27205-inception", MovieMediaType.Movie, status);

        var result = await _sut.GetFilm("27205-inception", _handler.Object, CancellationToken.None);

        AssertServedWithTheSiteHeaders(result, status, MovieMediaType.Movie);
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    public async Task GetSeries_ServesTheSeriesDocumentOfTheHandler(int status)
    {
        GivenDocument("1399-game-of-thrones", MovieMediaType.Tv, status);

        var result = await _sut.GetSeries("1399-game-of-thrones", _handler.Object, CancellationToken.None);

        AssertServedWithTheSiteHeaders(result, status, MovieMediaType.Tv);
    }

    [Theory]
    [InlineData(nameof(MovieShareDocumentController.GetFilm))]
    [InlineData(nameof(MovieShareDocumentController.GetSeries))]
    public void Documents_AreRateLimitedPerMovieUnderOneRouteCeiling(string action)
    {
        var method = typeof(MovieShareDocumentController).GetMethod(action)!;

        var rateLimit = Assert.Single(method.GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true));
        Assert.Equal(RateLimitingExtensions.MovieDocumentPolicy, ((EnableRateLimitingAttribute)rateLimit).PolicyName);
        var shared = method.GetCustomAttributes(typeof(SharedRateLimitAttribute), inherit: true)
            .Cast<SharedRateLimitAttribute>()
            .Select(attribute => attribute.PolicyName)
            .Order(StringComparer.Ordinal);
        Assert.Equal(SharedDocumentPolicies, shared);
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentPolicy)!.Value;
        var invitation = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.InvitationDocumentPolicy)!.Value;
        Assert.Equal((invitation.PermitLimit, invitation.WindowMinutes, invitation.Scope), (spec.PermitLimit, spec.WindowMinutes, spec.Scope));
    }
}

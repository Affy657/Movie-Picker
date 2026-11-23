using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.UseCases.ProfileShare;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class ProfileShareDocumentControllerTests
{
    private static readonly string[] SharedDocumentPolicies =
        [RateLimitingExtensions.ProfileDocumentPolicy, RateLimitingExtensions.ProfileDocumentCeilingPolicy];

    private readonly Mock<IGetProfileShareDocumentHandler> _handler = new();
    private readonly ProfileShareDocumentController _sut = new ProfileShareDocumentController().WithContext();

    public ProfileShareDocumentControllerTests()
    {
        _sut.Request.Scheme = "https";
        _sut.Request.Host = new Microsoft.AspNetCore.Http.HostString("api.example");
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    public async Task GetProfile_ServesTheProfileDocumentOfTheHandler(int status)
    {
        _handler.Setup(h => h.HandleAsync("lea", "https://api.example", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ShareDocument(status, "<html><div id=\"root\"></div>lea</html>"));

        var result = await _sut.GetProfile("lea", _handler.Object, CancellationToken.None);

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(status, content.StatusCode);
        Assert.Equal("text/html; charset=utf-8", content.ContentType);
        Assert.Contains("lea", content.Content);
        Assert.Equal("public, max-age=60", _sut.Response.Headers.CacheControl.ToString());
        Assert.Equal("frame-ancestors 'none'", _sut.Response.Headers.ContentSecurityPolicy.ToString());
    }

    [Fact]
    public void GetProfile_IsRateLimitedPerHandleUnderOneRouteCeiling()
    {
        var method = typeof(ProfileShareDocumentController).GetMethod(nameof(ProfileShareDocumentController.GetProfile))!;

        var rateLimit = Assert.Single(method.GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true));
        Assert.Equal(RateLimitingExtensions.ProfileDocumentPolicy, ((EnableRateLimitingAttribute)rateLimit).PolicyName);
        var shared = method.GetCustomAttributes(typeof(SharedRateLimitAttribute), inherit: true)
            .Cast<SharedRateLimitAttribute>()
            .Select(attribute => attribute.PolicyName)
            .Order(StringComparer.Ordinal);
        Assert.Equal(SharedDocumentPolicies.Order(StringComparer.Ordinal), shared);
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.ProfileDocumentPolicy)!.Value;
        var ceiling = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.ProfileDocumentCeilingPolicy)!.Value;
        Assert.True(ceiling.PermitLimit > spec.PermitLimit);
    }
}

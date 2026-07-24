using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Contracts;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class HealthControllerTests
{
    private static HealthController CreateController(
        DatabaseProbeResult probeResult,
        string? release = null)
    {
        var probe = new Mock<IDatabaseHealthProbe>();
        probe.Setup(p => p.CheckAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(probeResult);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["SENTRY_RELEASE"] = release })
            .Build();

        return new HealthController(probe.Object, configuration);
    }

    [Fact]
    public void Get_ReturnsOkHealthPayload()
    {
        var controller = CreateController(new DatabaseProbeResult(DatabaseProbeStatus.Healthy, 0));

        var result = controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<HealthOkResponse>(ok.Value);
        Assert.Equal("ok", payload.Status);
        Assert.Equal("movie-picker-api", payload.Service);
    }

    [Fact]
    public async Task GetReady_WhenDatabaseAnswers_Returns200AndRelease()
    {
        var controller = CreateController(new DatabaseProbeResult(DatabaseProbeStatus.Healthy, 12), "abc1234");

        var result = await controller.GetReady(CancellationToken.None);

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, response.StatusCode);
        var payload = Assert.IsType<HealthReadyResponse>(response.Value);
        Assert.Equal("ready", payload.Status);
        Assert.Equal("abc1234", payload.Release);
        var dependency = Assert.Single(payload.Dependencies);
        Assert.Equal("mongodb", dependency.Name);
        Assert.Equal("ok", dependency.Status);
        Assert.Equal(12, dependency.DurationMs);
    }

    [Fact]
    public async Task GetReady_WhenDatabaseUnreachable_Returns503()
    {
        var controller = CreateController(new DatabaseProbeResult(DatabaseProbeStatus.Unavailable, 3000));

        var result = await controller.GetReady(CancellationToken.None);

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        var payload = Assert.IsType<HealthReadyResponse>(response.Value);
        Assert.Equal("unavailable", payload.Status);
        Assert.Equal("unknown", payload.Release);
        Assert.Equal("unavailable", Assert.Single(payload.Dependencies).Status);
    }

    [Fact]
    public async Task GetReady_WithoutPersistence_Returns200AndNotConfigured()
    {
        var controller = CreateController(new DatabaseProbeResult(DatabaseProbeStatus.NotApplicable, 0));

        var result = await controller.GetReady(CancellationToken.None);

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, response.StatusCode);
        var payload = Assert.IsType<HealthReadyResponse>(response.Value);
        Assert.Equal("ready", payload.Status);
        Assert.Equal("not-configured", Assert.Single(payload.Dependencies).Status);
    }
}

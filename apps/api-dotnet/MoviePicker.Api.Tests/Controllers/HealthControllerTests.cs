using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Contracts;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class HealthControllerTests
{
    [Fact]
    public void Get_ReturnsOkHealthPayload()
    {
        var result = new HealthController().Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<HealthOkResponse>(ok.Value);
        Assert.Equal("ok", payload.Status);
        Assert.Equal("movie-picker-api", payload.Service);
    }
}

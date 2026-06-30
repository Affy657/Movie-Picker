using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ObservabilityRouteKindTests
{
    [Theory]
    [InlineData("/api/v1/auth/login", "auth")]
    [InlineData("/api/v1/auth/me", "auth")]
    [InlineData("/api/v1/events/abc/config", "event-config")]
    [InlineData("/api/v1/events/abc", "other")]
    [InlineData("/api/v1/movies/search", "other")]
    [InlineData("", "other")]
    public void ForPath_ClassifiesRoute(string path, string expected)
    {
        Assert.Equal(expected, ObservabilityRouteKind.ForPath(new PathString(path == "" ? null : path)));
    }
}

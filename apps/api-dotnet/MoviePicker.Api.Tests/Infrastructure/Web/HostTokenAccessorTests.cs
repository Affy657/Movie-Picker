using Microsoft.AspNetCore.Http;
using Moq;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class HostTokenAccessorTests
{
    private static HostTokenAccessor Build(HttpContext? ctx)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(ctx);
        return new HostTokenAccessor(accessor.Object);
    }

    [Fact]
    public void GetHostToken_NoHttpContext_ReturnsNull()
    {
        Assert.Null(Build(null).GetHostToken());
    }

    [Fact]
    public void GetHostToken_FromQuery()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.QueryString = new QueryString("?host=tok123");

        Assert.Equal("tok123", Build(ctx).GetHostToken());
    }

    [Fact]
    public void GetHostToken_FromCookie_WhenNoQuery()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers["Cookie"] = "moviepicker_host=ck123";

        Assert.Equal("ck123", Build(ctx).GetHostToken());
    }

    [Fact]
    public void GetHostToken_QueryWinsOverCookie()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.QueryString = new QueryString("?host=fromquery");
        ctx.Request.Headers["Cookie"] = "moviepicker_host=fromcookie";

        Assert.Equal("fromquery", Build(ctx).GetHostToken());
    }

    [Fact]
    public void GetHostToken_NothingPresent_ReturnsNull()
    {
        Assert.Null(Build(new DefaultHttpContext()).GetHostToken());
    }
}

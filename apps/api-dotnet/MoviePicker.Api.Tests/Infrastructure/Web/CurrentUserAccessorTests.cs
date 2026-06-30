using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Moq;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CurrentUserAccessorTests
{
    private static CurrentUserAccessor Build(HttpContext? ctx)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(ctx);
        return new CurrentUserAccessor(accessor.Object);
    }

    [Fact]
    public void GetUserId_NoHttpContext_ReturnsNull()
    {
        Assert.Null(Build(null).GetUserId());
    }

    [Fact]
    public void GetUserId_Unauthenticated_ReturnsNull()
    {
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) };

        Assert.Null(Build(ctx).GetUserId());
    }

    [Fact]
    public void GetUserId_Authenticated_ReturnsNameIdentifier()
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "user-42")], "cookie");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        Assert.Equal("user-42", Build(ctx).GetUserId());
    }
}

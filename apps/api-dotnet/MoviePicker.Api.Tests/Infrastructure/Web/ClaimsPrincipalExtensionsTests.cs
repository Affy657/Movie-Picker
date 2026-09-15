using System.Security.Claims;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void TryGetUserId_WithNameIdentifier_ReturnsIt()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "u1")], "test"));

        Assert.True(user.TryGetUserId(out var userId));
        Assert.Equal("u1", userId);
    }

    [Fact]
    public void TryGetUserId_Anonymous_ReturnsFalse()
    {
        Assert.False(new ClaimsPrincipal(new ClaimsIdentity()).TryGetUserId(out var userId));
        Assert.Null(userId);
    }
}

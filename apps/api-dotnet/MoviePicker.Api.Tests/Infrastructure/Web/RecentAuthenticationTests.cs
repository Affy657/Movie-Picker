using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class RecentAuthenticationTests
{
    private static readonly DateTimeOffset SignedInAt = new(2026, 9, 23, 20, 0, 0, TimeSpan.Zero);

    private static ClaimsPrincipal Session(params Claim[] claims) =>
        new(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "u1"), .. claims],
            CookieAuthenticationDefaults.AuthenticationScheme));

    [Fact]
    public void IsRecent_RightAfterTheSignIn_IsTrue()
    {
        var session = Session(RecentAuthentication.ClaimFor(SignedInAt));

        Assert.True(RecentAuthentication.IsRecent(session, SignedInAt.AddMinutes(9)));
    }

    [Fact]
    public void IsRecent_OnceTheWindowHasPassed_IsFalse()
    {
        var session = Session(RecentAuthentication.ClaimFor(SignedInAt));

        Assert.False(RecentAuthentication.IsRecent(session, SignedInAt + RecentAuthentication.Window + TimeSpan.FromSeconds(1)));
    }

    [Fact]
    public void IsRecent_WhenTheCheckingInstanceClockLagsBehind_IsTrue()
    {
        var session = Session(RecentAuthentication.ClaimFor(SignedInAt));

        Assert.True(RecentAuthentication.IsRecent(session, SignedInAt.AddSeconds(-2)));
    }

    [Fact]
    public void IsRecent_ASessionOpenedBeforeTheClaimExisted_IsFalse()
    {
        Assert.False(RecentAuthentication.IsRecent(Session(), SignedInAt));
        Assert.False(RecentAuthentication.IsRecent(new ClaimsPrincipal(new ClaimsIdentity()), SignedInAt));
        Assert.False(RecentAuthentication.IsRecent(null, SignedInAt));
    }

    [Theory]
    [InlineData("not-a-time")]
    [InlineData("-60")]
    [InlineData("")]
    public void IsRecent_AnUnreadableClaim_IsFalse(string value)
    {
        var session = Session(new Claim(RecentAuthentication.AuthenticatedAtClaimType, value));

        Assert.False(RecentAuthentication.IsRecent(session, SignedInAt));
    }

    [Fact]
    public void ClaimFor_StoresTheSignInTimeAsUnixSeconds()
    {
        var claim = RecentAuthentication.ClaimFor(SignedInAt);

        Assert.Equal(RecentAuthentication.AuthenticatedAtClaimType, claim.Type);
        Assert.Equal(SignedInAt.ToUnixTimeSeconds().ToString(System.Globalization.CultureInfo.InvariantCulture), claim.Value);
    }
}

using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class SessionWindowTests
{
    private static readonly DateTimeOffset Created = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void IssuedAt_FreshSession_IsItsCreation()
    {
        Assert.Equal(Created, SessionWindow.IssuedAt(Created, Created + AuthConstants.SessionLifetime));
    }

    [Fact]
    public void IssuedAt_RenewedSession_IsTheLastRenewal()
    {
        var renewedAt = Created.AddDays(16);

        Assert.Equal(renewedAt, SessionWindow.IssuedAt(Created, renewedAt + AuthConstants.SessionLifetime));
    }

    [Fact]
    public void SlidingRenewals_NeverExtendTheWindowBeyondTheSessionLifetime()
    {
        var expires = Created + AuthConstants.SessionLifetime;
        var now = Created;

        for (var day = 0; day < 200; day++)
        {
            now = now.AddDays(1);
            var issued = SessionWindow.IssuedAt(Created, expires);
            var elapsed = now - issued;
            var remaining = expires - now;
            if (remaining < elapsed)
                expires = now + (expires - issued);

            Assert.True(expires - now <= AuthConstants.SessionLifetime);
        }
    }

    [Fact]
    public void IsExpired_PastItsExpiry_IsTrue()
    {
        Assert.True(SessionWindow.IsExpired(Created, Created.AddDays(30), Created.AddDays(31)));
    }

    [Fact]
    public void IsExpired_ActiveSessionBeyondTheAbsoluteLifetime_IsTrue()
    {
        var now = Created + SessionWindow.AbsoluteLifetime + TimeSpan.FromMinutes(1);

        Assert.True(SessionWindow.IsExpired(Created, now.AddDays(10), now));
    }

    [Fact]
    public void IsExpired_ActiveSessionWithinBothLimits_IsFalse()
    {
        Assert.False(SessionWindow.IsExpired(Created, Created.AddDays(30), Created.AddDays(10)));
    }
}

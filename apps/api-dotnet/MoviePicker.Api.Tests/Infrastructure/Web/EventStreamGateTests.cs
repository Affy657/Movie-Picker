using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class EventStreamGateTests
{
    private static EventStreamGate Gate(int perInstance = 10, int perAccount = 2, int perAddress = 3) =>
        new(Options.Create(new EventLiveOptions
        {
            MaxStreamsPerInstance = perInstance,
            MaxStreamsPerAccount = perAccount,
            MaxAnonymousStreamsPerAddress = perAddress
        }));

    private static DefaultHttpContext SignedIn(string userId)
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test"));
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
        return context;
    }

    private static DefaultHttpContext Anonymous(string address)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(address);
        return context;
    }

    [Fact]
    public void TryEnter_CapsTheStreamsOfOneAccount()
    {
        var gate = Gate(perAccount: 2);

        Assert.True(gate.TryEnter(SignedIn("u1"), null, out _));
        Assert.True(gate.TryEnter(SignedIn("u1"), null, out _));
        Assert.False(gate.TryEnter(SignedIn("u1"), null, out _));
        Assert.True(gate.TryEnter(SignedIn("u2"), null, out _));
    }

    [Fact]
    public void TryEnter_LetsAnonymousViewersOfOneAddressShareALargerCap()
    {
        var gate = Gate(perAccount: 1, perAddress: 3);

        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), null, out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), null, out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), null, out _));
        Assert.False(gate.TryEnter(Anonymous("198.51.100.4"), null, out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.5"), null, out _));
    }

    [Fact]
    public void TryEnter_CapsTheStreamsOfTheWholeInstance()
    {
        var gate = Gate(perInstance: 2, perAccount: 5);

        Assert.True(gate.TryEnter(SignedIn("u1"), null, out _));
        Assert.True(gate.TryEnter(SignedIn("u2"), null, out _));
        Assert.False(gate.TryEnter(SignedIn("u3"), null, out _));
    }

    [Fact]
    public void ReleasedLease_FreesItsSlotOnce()
    {
        var gate = Gate(perInstance: 1, perAccount: 1);
        Assert.True(gate.TryEnter(SignedIn("u1"), null, out var lease));

        lease!.Dispose();
        lease.Dispose();

        Assert.True(gate.TryEnter(SignedIn("u1"), null, out _));
        Assert.False(gate.TryEnter(SignedIn("u2"), null, out _));
    }
    private const string TabA = "tab-aaaaaaaa";
    private const string TabB = "tab-bbbbbbbb";
    private const string TabC = "tab-cccccccc";

    [Fact]
    public void TryEnter_SameTabAgain_ReplacesItsPreviousStream_WithoutTakingAnotherSlot()
    {
        var gate = Gate(perAccount: 2);
        Assert.True(gate.TryEnter(SignedIn("u1"), TabA, out var first));

        Assert.True(gate.TryEnter(SignedIn("u1"), TabA, out var second));

        Assert.True(first!.IsReplaced);
        Assert.False(second!.IsReplaced);
        Assert.True(gate.TryEnter(SignedIn("u1"), TabB, out _));
        Assert.False(gate.TryEnter(SignedIn("u1"), TabC, out _));
    }

    [Fact]
    public void ReplacedLease_ReleasedLater_DoesNotFreeTheSlotOfItsReplacement()
    {
        var gate = Gate(perAccount: 1);
        Assert.True(gate.TryEnter(SignedIn("u1"), TabA, out var first));
        Assert.True(gate.TryEnter(SignedIn("u1"), TabA, out var second));

        first!.Dispose();

        Assert.False(gate.TryEnter(SignedIn("u1"), TabB, out _));
        second!.Dispose();
        Assert.True(gate.TryEnter(SignedIn("u1"), TabB, out _));
    }

    [Fact]
    public void TryEnter_SameTabOfAnotherViewer_ReplacesNothing()
    {
        var gate = Gate(perAccount: 2, perAddress: 2);
        Assert.True(gate.TryEnter(SignedIn("u1"), TabA, out var account));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), TabA, out var anonymous));

        Assert.True(gate.TryEnter(SignedIn("u2"), TabA, out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.5"), TabA, out _));

        Assert.False(account!.IsReplaced);
        Assert.False(anonymous!.IsReplaced);
    }

    [Theory]
    [InlineData("")]
    [InlineData("short")]
    [InlineData("tab with spaces")]
    [InlineData("0123456789012345678901234567890123456789012345678901234567890123456789")]
    public void TryEnter_MalformedTab_IsIgnored(string tab)
    {
        var gate = Gate(perAccount: 2);
        Assert.True(gate.TryEnter(SignedIn("u1"), tab, out var first));

        Assert.True(gate.TryEnter(SignedIn("u1"), tab, out _));

        Assert.False(first!.IsReplaced);
        Assert.False(gate.TryEnter(SignedIn("u1"), tab, out _));
    }
}

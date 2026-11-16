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

        Assert.True(gate.TryEnter(SignedIn("u1"), out _));
        Assert.True(gate.TryEnter(SignedIn("u1"), out _));
        Assert.False(gate.TryEnter(SignedIn("u1"), out _));
        Assert.True(gate.TryEnter(SignedIn("u2"), out _));
    }

    [Fact]
    public void TryEnter_LetsAnonymousViewersOfOneAddressShareALargerCap()
    {
        var gate = Gate(perAccount: 1, perAddress: 3);

        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.4"), out _));
        Assert.False(gate.TryEnter(Anonymous("198.51.100.4"), out _));
        Assert.True(gate.TryEnter(Anonymous("198.51.100.5"), out _));
    }

    [Fact]
    public void TryEnter_CapsTheStreamsOfTheWholeInstance()
    {
        var gate = Gate(perInstance: 2, perAccount: 5);

        Assert.True(gate.TryEnter(SignedIn("u1"), out _));
        Assert.True(gate.TryEnter(SignedIn("u2"), out _));
        Assert.False(gate.TryEnter(SignedIn("u3"), out _));
    }

    [Fact]
    public void ReleasedLease_FreesItsSlotOnce()
    {
        var gate = Gate(perInstance: 1, perAccount: 1);
        Assert.True(gate.TryEnter(SignedIn("u1"), out var lease));

        lease!.Dispose();
        lease.Dispose();

        Assert.True(gate.TryEnter(SignedIn("u1"), out _));
        Assert.False(gate.TryEnter(SignedIn("u2"), out _));
    }
}

using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventHostTests
{
    private static Event Evt() => new() { Id = "evt1", HostToken = "ht1", CreatorUserId = "creator" };

    [Fact]
    public void IsHost_MatchingToken_True()
    {
        Assert.True(EventHost.IsHost(Evt(), "ht1", currentUserId: null));
    }

    [Fact]
    public void IsHost_MatchingCreator_True()
    {
        Assert.True(EventHost.IsHost(Evt(), hostToken: null, "creator"));
    }

    [Fact]
    public void IsHost_TokenMatchesEvenIfUserWrong_True()
    {
        Assert.True(EventHost.IsHost(Evt(), "ht1", "someone-else"));
    }

    [Fact]
    public void IsHost_WrongTokenAndWrongUser_False()
    {
        Assert.False(EventHost.IsHost(Evt(), "wrong", "someone-else"));
    }

    [Fact]
    public void IsHost_BothNull_False()
    {
        Assert.False(EventHost.IsHost(Evt(), hostToken: null, currentUserId: null));
    }

    [Fact]
    public void IsHost_EmptyToken_DoesNotMatchEmptyHostToken()
    {
        var evt = new Event { Id = "evt1", HostToken = string.Empty, CreatorUserId = "creator" };

        Assert.False(EventHost.IsHost(evt, hostToken: string.Empty, currentUserId: null));
    }
}

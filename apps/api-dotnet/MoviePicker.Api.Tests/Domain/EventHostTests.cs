using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventHostTests
{
    private static Event Evt() => new() { Id = "evt1", CreatorUserId = "creator", CoHostUserIds = ["co-host"] };

    [Theory]
    [InlineData("creator", true)]
    [InlineData("co-host", true)]
    [InlineData("someone-else", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsHost_OnlyTheCreatorOrACoHostAccount(string? userId, bool expected)
    {
        Assert.Equal(expected, EventHost.IsHost(Evt(), userId));
    }

    [Theory]
    [InlineData("creator", true)]
    [InlineData("co-host", false)]
    [InlineData("someone-else", false)]
    [InlineData(null, false)]
    public void IsCreator_OnlyTheCreatorAccount(string? userId, bool expected)
    {
        Assert.Equal(expected, EventHost.IsCreator(Evt(), userId));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void IsHost_AnEventWithoutCreator_HasNoHost(string? userId)
    {
        var evt = new Event { Id = "evt1" };

        Assert.False(EventHost.IsHost(evt, userId));
        Assert.False(EventHost.IsCreator(evt, userId));
    }
}

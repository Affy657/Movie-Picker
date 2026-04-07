using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class ReactionPolicyTests
{
    [Fact]
    public void IsAllowed_NullAllowedList_AllKnownCatalogIds()
    {
        foreach (var id in ReactionCatalog.KnownIds)
            Assert.True(ReactionPolicy.IsAllowed(null, id));
    }

    [Fact]
    public void IsAllowed_NullConfig_AllKnownCatalogIds()
    {
        var evtConfig = new EventConfig();
        foreach (var id in ReactionCatalog.KnownIds)
            Assert.True(ReactionPolicy.IsAllowed(evtConfig, id));
    }

    [Fact]
    public void IsAllowed_EmptyList_None()
    {
        var c = new EventConfig { AllowedReactionIds = Array.Empty<string>() };
        Assert.False(ReactionPolicy.IsAllowed(c, "already_seen"));
    }

    [Fact]
    public void IsAllowed_Subset_OnlyListed()
    {
        var c = new EventConfig { AllowedReactionIds = new[] { "meh" } };
        Assert.True(ReactionPolicy.IsAllowed(c, "meh"));
        Assert.False(ReactionPolicy.IsAllowed(c, "already_seen"));
    }

    [Fact]
    public void IsAllowed_UnknownId_False()
    {
        Assert.False(ReactionPolicy.IsAllowed(null, "nope"));
    }
}

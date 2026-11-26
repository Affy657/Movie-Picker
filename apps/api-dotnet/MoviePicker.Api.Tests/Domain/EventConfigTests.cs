using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventConfigTests
{
    [Fact]
    public void Caps_StayWithinWhatTheLiveFeedServesWithoutFallingBackToPolling()
    {
        Assert.Equal(50, EventConfig.MaxParticipantsCap);
        Assert.Equal(15, EventConfig.MaxProposalsPerParticipantCap);
    }

    [Theory]
    [InlineData(300, 50)]
    [InlineData(51, 50)]
    [InlineData(50, 50)]
    [InlineData(8, 8)]
    public void MaxParticipants_SetAboveTheCap_ReadsAsTheCap(int stored, int read) =>
        Assert.Equal(read, new EventConfig { MaxParticipants = stored }.MaxParticipants);

    [Theory]
    [InlineData(100, 15)]
    [InlineData(16, 15)]
    [InlineData(15, 15)]
    [InlineData(2, 2)]
    public void MaxProposalsPerParticipant_SetAboveTheCap_ReadsAsTheCap(int stored, int read) =>
        Assert.Equal(read, new EventConfig { MaxProposalsPerParticipant = stored }.MaxProposalsPerParticipant);

    [Fact]
    public void Limits_LeftOpen_StayOpen()
    {
        var config = new EventConfig();

        Assert.Null(config.MaxParticipants);
        Assert.Null(config.MaxProposalsPerParticipant);
    }

    [Fact]
    public void Limits_CopiedAlongAnotherChange_StayCapped()
    {
        var copied = new EventConfig { MaxParticipants = 300, MaxProposalsPerParticipant = 100 } with { Theme = "Horreur" };

        Assert.Equal(EventConfig.MaxParticipantsCap, copied.MaxParticipants);
        Assert.Equal(EventConfig.MaxProposalsPerParticipantCap, copied.MaxProposalsPerParticipant);
    }
}

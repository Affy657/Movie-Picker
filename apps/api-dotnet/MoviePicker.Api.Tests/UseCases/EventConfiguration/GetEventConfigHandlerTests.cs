using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class GetEventConfigHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly GetEventConfigHandler _sut;

    public GetEventConfigHandlerTests()
    {
        _sut = new GetEventConfigHandler(_events.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_NoConfig_ReturnsDefaults()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Id = "evt1", Config = null });

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(WheelMode.StrictRandom, result.WheelMode);
        Assert.True(result.RichSharePreview);
        Assert.False(result.AllowSeries);
        Assert.Null(result.Theme);
    }

    [Fact]
    public async Task HandleAsync_WithConfig_MapsFields()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt1",
                Config = new EventConfig
                {
                    Theme = "Horreur",
                    MaxProposalsPerParticipant = 3,
                    MaxParticipants = 10,
                    WheelMode = WheelMode.WeightedByVotes,
                    AllowSeries = true
                }
            });

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Horreur", result.Theme);
        Assert.Equal(3, result.MaxProposalsPerParticipant);
        Assert.Equal(10, result.MaxParticipants);
        Assert.Equal(WheelMode.WeightedByVotes, result.WheelMode);
        Assert.True(result.AllowSeries);
    }
}

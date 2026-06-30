using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class EventRepositoryExtensionsTests
{
    [Fact]
    public async Task GetRequiredByIdOrSlugAsync_Found_ReturnsEvent()
    {
        var evt = new EventEntityBuilder().WithId("e1").Build();
        var repo = new Mock<IEventRepository>();
        repo.Setup(r => r.GetByIdOrSlugAsync("e1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await repo.Object.GetRequiredByIdOrSlugAsync("e1");

        Assert.Same(evt, result);
    }

    [Fact]
    public async Task GetRequiredByIdOrSlugAsync_NotFound_ThrowsNotFound()
    {
        var repo = new Mock<IEventRepository>();
        repo.Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => repo.Object.GetRequiredByIdOrSlugAsync("missing"));
    }
}

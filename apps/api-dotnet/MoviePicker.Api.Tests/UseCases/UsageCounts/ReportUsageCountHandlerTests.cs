using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UsageCounts;

public sealed class ReportUsageCountHandlerTests
{
    [Fact]
    public async Task HandleAsync_RecordsAStepTheBrowserReports()
    {
        var recorder = new Mock<IUsageRecorder>();
        var handler = new ReportUsageCountHandler(recorder.Object);

        await handler.HandleAsync(new ReportUsageCountRequest { Metric = "event_link_opened", Variant = "visitor.open" });

        recorder.Verify(
            x => x.RecordAsync(
                It.Is<UsageCount>(c => c.Metric == "event_link_opened" && c.Variant == "visitor.open"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("event_joined", "new_account")]
    [InlineData("user_signed_up", "email.event")]
    [InlineData("event_link_opened", "member.open")]
    [InlineData("anything", "all")]
    public async Task HandleAsync_RefusesWhatTheBrowserCannotReport(string metric, string variant)
    {
        var recorder = new Mock<IUsageRecorder>();
        var handler = new ReportUsageCountHandler(recorder.Object);

        var error = await Assert.ThrowsAsync<BadRequestException>(
            () => handler.HandleAsync(new ReportUsageCountRequest { Metric = metric, Variant = variant }));

        Assert.Equal(ErrorCodes.UnknownUsageCount, error.Reason);
        recorder.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

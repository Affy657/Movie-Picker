using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.UsageCounts;

public sealed class ReportUsageCountHandler : IReportUsageCountHandler
{
    private readonly IUsageRecorder _recorder;

    public ReportUsageCountHandler(IUsageRecorder recorder)
    {
        _recorder = recorder;
    }

    public async Task HandleAsync(ReportUsageCountRequest request, CancellationToken ct = default)
    {
        if (!UsageCount.TryParseReported(request.Metric, request.Variant, out var count))
            throw Errors.UnknownUsageCount();

        await _recorder.RecordAsync(count, ct);
    }
}

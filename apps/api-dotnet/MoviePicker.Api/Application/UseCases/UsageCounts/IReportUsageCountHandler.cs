using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UsageCounts;

public interface IReportUsageCountHandler
{
    Task HandleAsync(ReportUsageCountRequest request, CancellationToken ct = default);
}

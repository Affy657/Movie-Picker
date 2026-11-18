using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.UseCases.UsageCounts;

public interface IUsageRecorder
{
    Task RecordAsync(UsageCount count, CancellationToken ct = default);
}

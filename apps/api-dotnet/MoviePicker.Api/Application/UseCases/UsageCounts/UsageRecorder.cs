using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.UseCases.UsageCounts;

public sealed class UsageRecorder : IUsageRecorder
{
    private readonly IUsageCountRepository _counts;
    private readonly ILogger<UsageRecorder> _logger;
    private readonly TimeProvider _clock;

    public UsageRecorder(IUsageCountRepository counts, ILogger<UsageRecorder> logger, TimeProvider clock)
    {
        _counts = counts;
        _logger = logger;
        _clock = clock;
    }

    public async Task RecordAsync(UsageCount count, CancellationToken ct = default)
    {
        try
        {
            await _counts.IncrementAsync(UsageCount.DayOf(_clock.GetUtcNow()), count, ct);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Usage count {Metric} {Variant} was not recorded", count.Metric, count.Variant);
        }
    }
}

using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.Ports;

public interface IUsageCountRepository
{
    Task IncrementAsync(DateOnly day, UsageCount count, CancellationToken ct = default);
}

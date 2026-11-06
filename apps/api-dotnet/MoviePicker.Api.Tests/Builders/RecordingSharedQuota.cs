using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Tests.Builders;

public sealed record SharedQuotaCall(string Scope, string Subject, int Limit, TimeSpan Window);

public sealed class RecordingSharedQuota : ISharedQuota
{
    public bool Allows { get; set; } = true;

    public List<SharedQuotaCall> Calls { get; } = [];

    public Task<bool> TryConsumeAsync(string scope, string subject, int limit, TimeSpan window, CancellationToken ct = default)
    {
        Calls.Add(new SharedQuotaCall(scope, subject, limit, window));
        return Task.FromResult(Allows);
    }
}

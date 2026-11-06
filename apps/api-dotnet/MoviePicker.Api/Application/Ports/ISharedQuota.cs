namespace MoviePicker.Api.Application.Ports;

public interface ISharedQuota
{
    Task<bool> TryConsumeAsync(string scope, string subject, int limit, TimeSpan window, CancellationToken ct = default);
}

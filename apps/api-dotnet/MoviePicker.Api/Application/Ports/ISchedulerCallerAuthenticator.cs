namespace MoviePicker.Api.Application.Ports;

public enum SchedulerCallerVerdict
{
    NotConfigured,
    Refused,
    Accepted
}

public sealed record SchedulerCallerCredentials(string? BearerToken);

public interface ISchedulerCallerAuthenticator
{
    Task<SchedulerCallerVerdict> AuthenticateAsync(SchedulerCallerCredentials credentials, CancellationToken ct);
}

namespace MoviePicker.Api.Contracts;

public sealed record HealthDependencyStatus(string Name, string Status, long DurationMs);

public sealed record HealthReadyResponse(
    string Status,
    string Service,
    string Release,
    IReadOnlyList<HealthDependencyStatus> Dependencies);

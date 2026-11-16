namespace MoviePicker.Api.Application.UseCases.EventLive;

public sealed record EventStreamAccess(string EventId, string Slug, string? ParticipantId);

public interface IOpenEventStreamHandler
{
    Task<EventStreamAccess> HandleAsync(string idOrSlug, CancellationToken ct = default);
}

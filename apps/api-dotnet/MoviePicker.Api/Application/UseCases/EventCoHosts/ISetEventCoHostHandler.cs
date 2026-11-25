namespace MoviePicker.Api.Application.UseCases.EventCoHosts;

public interface ISetEventCoHostHandler
{
    Task HandleAsync(
        string userId,
        string idOrSlug,
        string participantId,
        bool coHost,
        CancellationToken ct = default);
}

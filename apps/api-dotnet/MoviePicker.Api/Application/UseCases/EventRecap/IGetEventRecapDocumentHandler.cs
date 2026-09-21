namespace MoviePicker.Api.Application.UseCases.EventRecap;

public interface IGetEventRecapDocumentHandler
{
    Task<EventRecapDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default);
}

public sealed record EventRecapDocument(int StatusCode, string Html);

using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.EventRecap;

public interface IGetEventRecapDocumentHandler
{
    Task<ShareDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default);
}

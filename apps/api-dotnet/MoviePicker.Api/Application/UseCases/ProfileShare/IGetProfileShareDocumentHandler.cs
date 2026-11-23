using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.ProfileShare;

public interface IGetProfileShareDocumentHandler
{
    Task<ShareDocument> HandleAsync(string handle, string apiPublicBaseUrl, CancellationToken ct = default);
}

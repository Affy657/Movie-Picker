using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.EventInvitation;

public interface IGetEventInvitationDocumentHandler
{
    Task<ShareDocument> HandleAsync(string slug, string apiPublicBaseUrl, CancellationToken ct = default);
}

namespace MoviePicker.Api.Application.UseCases.EventSharePreview;

public interface IGetEventSharePreviewHtmlHandler
{
    Task<string> BuildHtmlAsync(string idOrSlug, string apiPublicBaseUrl, CancellationToken ct = default);
}

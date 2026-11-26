using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.EventViewTag;

public interface IEventViewTagHandler
{
    Task<string?> HandleAsync(string idOrSlug, CatalogLanguage language, CancellationToken ct = default);
}

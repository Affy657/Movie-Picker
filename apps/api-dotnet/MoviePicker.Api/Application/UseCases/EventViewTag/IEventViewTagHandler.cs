namespace MoviePicker.Api.Application.UseCases.EventViewTag;

public interface IEventViewTagHandler
{
    Task<string?> HandleAsync(string idOrSlug, CancellationToken ct = default);
}

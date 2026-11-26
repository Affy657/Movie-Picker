namespace MoviePicker.Api.Application.UseCases.EventViewTag;

public interface IEventViewTagHandler
{
    Task<string?> HandleAsync(string slug, CancellationToken ct = default);
}

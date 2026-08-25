using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public interface ICreateIdeaSuggestionHandler
{
    Task HandleAsync(string userId, CreateIdeaSuggestionRequest request, CancellationToken ct = default);
}

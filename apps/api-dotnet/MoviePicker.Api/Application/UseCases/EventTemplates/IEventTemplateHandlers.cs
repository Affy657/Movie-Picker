using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public interface IListEventTemplatesHandler
{
    Task<EventTemplateListResponse> HandleAsync(string userId, CancellationToken ct = default);
}

public interface ICreateEventTemplateHandler
{
    Task<EventTemplateResponse> HandleAsync(
        string userId,
        SaveEventTemplateRequest request,
        CancellationToken ct = default);
}

public interface IUpdateEventTemplateHandler
{
    Task<EventTemplateResponse> HandleAsync(
        string userId,
        string templateId,
        SaveEventTemplateRequest request,
        CancellationToken ct = default);
}

public interface IDeleteEventTemplateHandler
{
    Task HandleAsync(string userId, string templateId, CancellationToken ct = default);
}

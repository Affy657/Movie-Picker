using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public interface IListSavedListsHandler
{
    Task<SavedListsResponse> HandleAsync(
        string userId,
        string? sourceType,
        string? sourceId,
        CancellationToken ct = default);
}

public interface ISaveListHandler
{
    Task<SavedListSaving> HandleAsync(string userId, SaveListRequest request, CancellationToken ct = default);
}

public interface IGetSavedListHandler
{
    Task<SavedListResponse> HandleAsync(string userId, string savedListId, CancellationToken ct = default);
}

public interface IUnsaveListHandler
{
    Task HandleAsync(string userId, string savedListId, CancellationToken ct = default);
}

public interface ICopySavedListHandler
{
    Task<MovieListResponse> HandleAsync(
        string userId,
        string savedListId,
        CopySavedListRequest request,
        CancellationToken ct = default);
}

public sealed record SavedListSaving(SavedListSummaryResponse Summary, bool Created);

using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.PublicLists;

public interface IListPublicListsHandler
{
    Task<PublicListsResponse> HandleAsync(string handle, string? viewerId, CancellationToken ct = default);
}

public interface IGetPublicListHandler
{
    Task<PublicListResponse> HandleAsync(string handle, string listId, string? viewerId, CancellationToken ct = default);
}

public interface ICopyPublicListHandler
{
    Task<MovieListResponse> HandleAsync(
        string userId,
        string handle,
        string listId,
        CopySavedListRequest request,
        CancellationToken ct = default);
}

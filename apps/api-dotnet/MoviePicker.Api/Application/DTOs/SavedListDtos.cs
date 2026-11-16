using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class SaveListRequest
{
    [Required]
    public string SourceType { get; init; } = string.Empty;

    [Required]
    public string SourceId { get; init; } = string.Empty;
}

public sealed class CopySavedListRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;
}

public record SavedListSummaryResponse
{
    public string Id { get; init; } = string.Empty;
    public ListSourceType SourceType { get; init; }
    public string SourceId { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Description { get; init; }
    public ListCreatorResponse? Creator { get; init; }
    public int ItemCount { get; init; }
    public IReadOnlyList<string> PosterPaths { get; init; } = [];
    public int WatchedCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public bool Unavailable { get; init; }
    public ListSourceUnavailableReason? UnavailableReason { get; init; }
    public bool CopyAvailable { get; init; }
}

public sealed record SavedListResponse : SavedListSummaryResponse
{
    public SavedListResponse()
    {
    }

    public SavedListResponse(SavedListSummaryResponse summary, IReadOnlyList<MovieListItemResponse> items)
        : base(summary)
    {
        Items = items;
    }

    public IReadOnlyList<MovieListItemResponse> Items { get; init; } = [];
}

public sealed class SavedListsResponse
{
    public IReadOnlyList<SavedListSummaryResponse> Items { get; init; } = [];
}

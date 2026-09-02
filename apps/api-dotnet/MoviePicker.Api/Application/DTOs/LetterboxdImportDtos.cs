using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class LetterboxdImportCandidateResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public int? RuntimeMinutes { get; init; }
}

public sealed class LetterboxdImportRowResponse
{
    public int RowIndex { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? LetterboxdSlug { get; init; }
    public IReadOnlyList<LetterboxdImportCandidateResponse> Candidates { get; init; } = [];
}

public sealed class LetterboxdSyncResponse
{
    public bool Skipped { get; init; }
    public int Added { get; init; }
    public int Removed { get; init; }
    public IReadOnlyList<string> UnmatchedTitles { get; init; } = [];
    public IReadOnlyList<LetterboxdImportRowResponse> PendingChoices { get; init; } = [];
    public int TotalOnLetterboxd { get; init; }
    public int TotalTruncated { get; init; }
}

public sealed class LetterboxdImportConfirmRequest
{
    [Required]
    public IReadOnlyList<AddWatchlistItemRequest> Selections { get; init; } = [];

    public int? RemainingUnresolvedCount { get; init; }
}

public sealed class LetterboxdImportConfirmResponse
{
    public int Added { get; init; }
    public int AlreadyPresent { get; init; }
    public int PendingReconciliationCount { get; init; }
}

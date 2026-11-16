using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public enum LetterboxdImportTarget
{
    Watchlist,
    Watched
}

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
    public LetterboxdImportTarget Target { get; init; } = LetterboxdImportTarget.Watchlist;
    public int? Rating { get; init; }
    public DateOnly? WatchedOn { get; init; }
    public IReadOnlyList<LetterboxdImportCandidateResponse> Candidates { get; init; } = [];
}

public sealed class LetterboxdSyncResponse
{
    public bool Skipped { get; init; }
    public string? Error { get; init; }
    public int Added { get; init; }
    public int Removed { get; init; }
    public IReadOnlyList<string> UnmatchedTitles { get; init; } = [];
    public IReadOnlyList<LetterboxdImportRowResponse> PendingChoices { get; init; } = [];
    public int TotalOnLetterboxd { get; init; }
    public int TotalTruncated { get; init; }
    public int WatchedAdded { get; init; }
    public int WatchedRemoved { get; init; }
    public IReadOnlyList<string> WatchedUnmatchedTitles { get; init; } = [];
    public IReadOnlyList<LetterboxdImportRowResponse> WatchedPendingChoices { get; init; } = [];
    public int WatchedTotalOnLetterboxd { get; init; }
    public int WatchedTotalTruncated { get; init; }
}

public sealed class LetterboxdWatchedSelectionRequest : TmdbTitleRequest, ITmdbTitleFactsRequest
{
    public double? VoteAverage { get; init; }

    public int? RuntimeMinutes { get; init; }

    [MaxLength(20)]
    public IReadOnlyList<int>? GenreIds { get; init; }

    [MaxLength(200)]
    public string? LetterboxdSlug { get; init; }

    [Range(MovieRating.MinValue, MovieRating.MaxValue)]
    public int? Rating { get; init; }

    public DateOnly? WatchedOn { get; init; }
}

public sealed class LetterboxdImportConfirmRequest
{
    [Required]
    [NoEmptyItems]
    public IReadOnlyList<AddWatchlistItemRequest> Selections { get; init; } = [];

    [NoEmptyItems]
    public IReadOnlyList<LetterboxdWatchedSelectionRequest>? WatchedSelections { get; init; }

    public int? RemainingUnresolvedCount { get; init; }
}

public sealed class LetterboxdImportConfirmResponse
{
    public int Added { get; init; }
    public int AlreadyPresent { get; init; }
    public int WatchedAdded { get; init; }
    public int WatchedAlreadyPresent { get; init; }
    public int PendingReconciliationCount { get; init; }
}

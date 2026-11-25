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
    public LetterboxdImportTarget Target { get; init; } = LetterboxdImportTarget.Watchlist;
    public int? Rating { get; init; }
    public DateOnly? WatchedOn { get; init; }
    public IReadOnlyList<LetterboxdImportCandidateResponse> Candidates { get; init; } = [];
}

public sealed class LetterboxdListSyncResponse
{
    public LetterboxdImportTarget Target { get; init; }
    public int Added { get; init; }
    public int Removed { get; init; }
    public IReadOnlyList<string> UnmatchedTitles { get; init; } = [];
    public IReadOnlyList<LetterboxdImportRowResponse> PendingChoices { get; init; } = [];
    public int TotalOnLetterboxd { get; init; }
    public int TotalTruncated { get; init; }
    public bool Incomplete { get; init; }
    public DateTimeOffset? LastSyncAt { get; init; }
    public string? Error { get; init; }
}

public sealed class LetterboxdSyncResponse
{
    public bool Skipped { get; init; }
    public string? Error { get; init; }
    public IReadOnlyList<LetterboxdListSyncResponse> Lists { get; init; } = [];
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

    public bool? FromExport { get; init; }
}

public sealed class LetterboxdImportConfirmResponse
{
    public int Added { get; init; }
    public int AlreadyPresent { get; init; }
    public int WatchedAdded { get; init; }
    public int WatchedAlreadyPresent { get; init; }
    public int PendingReconciliationCount { get; init; }
}

public sealed class LetterboxdExportFileRequest
{
    public const int MaxBase64Length = 16_000_000;

    [Required]
    [MaxLength(260)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [MaxLength(MaxBase64Length)]
    public string Base64Content { get; init; } = string.Empty;
}

public sealed class LetterboxdExportReadRequest
{
    public const int MaxFiles = 8;

    [Required]
    [MinLength(1)]
    [MaxLength(MaxFiles)]
    [NoEmptyItems]
    public IReadOnlyList<LetterboxdExportFileRequest> Files { get; init; } = [];
}

public sealed class LetterboxdExportFilmResponse
{
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public int? Rating { get; init; }
    public DateOnly? WatchedOn { get; init; }
}

public sealed class LetterboxdExportResponse
{
    public IReadOnlyList<LetterboxdExportFilmResponse> Watchlist { get; init; } = [];
    public IReadOnlyList<LetterboxdExportFilmResponse> Watched { get; init; } = [];
}

public sealed class LetterboxdExportRowRequest
{
    [Range(1, int.MaxValue)]
    public int RowIndex { get; init; }

    [Required]
    [MaxLength(300)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    [Range(MovieRating.MinValue, MovieRating.MaxValue)]
    public int? Rating { get; init; }

    public DateOnly? WatchedOn { get; init; }
}

public sealed class LetterboxdExportImportRequest
{
    public const int MaxRows = 50;

    public LetterboxdImportTarget Target { get; init; } = LetterboxdImportTarget.Watchlist;

    [Required]
    [MaxLength(MaxRows)]
    [NoEmptyItems]
    public IReadOnlyList<LetterboxdExportRowRequest> Rows { get; init; } = [];
}

public sealed class LetterboxdExportImportResponse
{
    public int Added { get; init; }
    public int AlreadyPresent { get; init; }
    public IReadOnlyList<LetterboxdImportRowResponse> PendingChoices { get; init; } = [];
    public IReadOnlyList<string> UnmatchedTitles { get; init; } = [];
}

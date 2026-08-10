using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class LetterboxdImportPreviewRequest
{
    [Required]
    [MaxLength(500_000)]
    public string Csv { get; init; } = string.Empty;
}

public sealed class LetterboxdImportCandidateResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
}

public sealed class LetterboxdImportRowResponse
{
    public int RowIndex { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? LetterboxdSlug { get; init; }
    public bool AlreadyInWatchlist { get; init; }
    public IReadOnlyList<LetterboxdImportCandidateResponse> Candidates { get; init; } = [];
}

public sealed class LetterboxdImportPreviewResponse
{
    public IReadOnlyList<LetterboxdImportRowResponse> Rows { get; init; } = [];
    public int TotalParsed { get; init; }
    public int TotalTruncated { get; init; }
}

public sealed class LetterboxdImportConfirmRequest
{
    [Required]
    public IReadOnlyList<AddWatchlistItemRequest> Selections { get; init; } = [];
}

public sealed class LetterboxdImportConfirmResponse
{
    public int Added { get; init; }
    public int AlreadyPresent { get; init; }
}

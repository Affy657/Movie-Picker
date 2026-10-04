using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public abstract class TmdbTitleRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int TmdbId { get; init; }

    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    [MaxLength(500)]
    public string? PosterPath { get; init; }
}

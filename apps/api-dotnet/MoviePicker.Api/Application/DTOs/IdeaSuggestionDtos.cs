using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class CreateIdeaSuggestionRequest
{
    [Required]
    public IdeaSuggestionCategory? Category { get; init; }

    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MinLength(1)]
    [MaxLength(2000)]
    public string Description { get; init; } = string.Empty;

    [MaxLength(300)]
    public string? PagePath { get; init; }

    [MaxLength(20)]
    public string? AppVersion { get; init; }

    public IReadOnlyList<IdeaSuggestionAttachmentDto>? Attachments { get; init; }
}

public sealed class IdeaSuggestionAttachmentDto
{
    [Required]
    [MaxLength(150)]
    public string FileName { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^image/(png|jpeg|webp|gif)$")]
    public string ContentType { get; init; } = string.Empty;

    /// <summary>
    /// Contenu base64 de l'image (sans le préfixe data:). Plafonné à ~4 Mo binaire
    /// (facteur d'encodage base64 ~1.37 + marge).
    /// </summary>
    [Required]
    [MaxLength(5_600_000)]
    public string Base64Content { get; init; } = string.Empty;
}

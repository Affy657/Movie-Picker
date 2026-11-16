using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class PresenceRequest
{
    [Required]
    [JsonRequired]
    public bool Proposing { get; init; }
}

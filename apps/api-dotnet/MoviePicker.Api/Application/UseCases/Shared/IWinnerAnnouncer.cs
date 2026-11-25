using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public interface IWinnerAnnouncer
{
    Task AnnounceAsync(
        Event evt,
        string winnerTitle,
        WinnerPickMethod method,
        string? pickedBy,
        CancellationToken ct = default);
}

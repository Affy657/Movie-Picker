using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IDeleteAccountHandler
{
    Task HandleAsync(string userId, DeleteAccountRequest request, CancellationToken ct = default);
}

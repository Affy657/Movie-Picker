using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IChangePasswordHandler
{
    Task HandleAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default);
}

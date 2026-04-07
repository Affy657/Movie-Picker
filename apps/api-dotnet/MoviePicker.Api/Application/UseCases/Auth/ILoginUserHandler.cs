using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface ILoginUserHandler
{
    Task<LoginResponse> HandleAsync(LoginRequest request, CancellationToken ct = default);
}

using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IRegisterUserHandler
{
    Task<RegisterResponse> HandleAsync(RegisterRequest request, CancellationToken ct = default);
}

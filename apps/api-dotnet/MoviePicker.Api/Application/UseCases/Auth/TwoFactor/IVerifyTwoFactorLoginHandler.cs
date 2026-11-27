using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public interface IVerifyTwoFactorLoginHandler
{
    Task<TwoFactorLoginResponse> HandleAsync(TwoFactorChallenge challenge, string code, CancellationToken ct = default);
}

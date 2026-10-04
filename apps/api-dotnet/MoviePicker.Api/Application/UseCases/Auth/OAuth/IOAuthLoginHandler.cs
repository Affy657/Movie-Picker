using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public interface IOAuthLoginHandler
{
    Task<OAuthOutcome> HandleAsync(ExternalLoginInfo info, string? accessToken = null, CancellationToken ct = default);
}

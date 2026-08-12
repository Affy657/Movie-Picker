using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public interface IOAuthLinkHandler
{
    Task<OAuthOutcome> HandleAsync(string currentUserId, ExternalLoginInfo info, CancellationToken ct = default);
}

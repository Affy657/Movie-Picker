using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.InviteUser;

public interface IInviteUserHandler
{
    Task<InviteUserResponse> HandleAsync(string idOrSlug, InviteUserRequest request, CancellationToken ct = default);
}

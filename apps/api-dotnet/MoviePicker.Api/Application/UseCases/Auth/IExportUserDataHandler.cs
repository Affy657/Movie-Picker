using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth;

public interface IExportUserDataHandler
{
    Task<UserDataExportResponse> HandleAsync(string userId, CancellationToken ct = default);
}

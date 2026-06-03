namespace MoviePicker.Api.Application.UseCases.Follow;

public interface IUnfollowUserHandler
{
    Task HandleAsync(string currentUserId, string targetHandle, CancellationToken ct = default);
}

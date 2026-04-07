using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class CurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? GetUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return null;
        return user.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}

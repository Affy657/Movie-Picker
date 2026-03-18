using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class HostTokenAccessor : IHostTokenAccessor
{
    private const string HostQueryKey = "host";
    private const string HostCookieName = "moviepicker_host";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public HostTokenAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? GetHostToken()
    {
        var ctx = _httpContextAccessor.HttpContext;
        if (ctx is null)
            return null;

        if (ctx.Request.Query.TryGetValue(HostQueryKey, out var q) && !string.IsNullOrEmpty(q))
            return q.ToString();

        if (ctx.Request.Cookies.TryGetValue(HostCookieName, out var cookie) && !string.IsNullOrEmpty(cookie))
            return cookie;

        return null;
    }
}

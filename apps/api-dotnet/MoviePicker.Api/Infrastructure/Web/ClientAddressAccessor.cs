using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class ClientAddressAccessor : IClientAddressAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ClientAddressAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetClientAddress() =>
        _httpContextAccessor.HttpContext is { } httpContext ? ClientIpPartitionKey.Get(httpContext) : "unknown";
}

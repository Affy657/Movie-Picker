using System.Net;
using Microsoft.Extensions.Primitives;

namespace MoviePicker.Api.Infrastructure.Web;

internal static class FirebaseHostingRelay
{
    private static readonly IPNetwork[] GoogleFrontEndNetworksHostingCallsCloudRunFrom =
    [
        IPNetwork.Parse("66.102.0.0/20"),
        IPNetwork.Parse("66.249.64.0/19"),
        IPNetwork.Parse("74.125.0.0/16"),
        IPNetwork.Parse("142.250.0.0/15"),
        IPNetwork.Parse("192.178.0.0/15")
    ];

    internal static bool Carries(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress is { } peer && IsGoogleFrontEnd(peer);

    internal static IReadOnlyList<bool> GoogleFrontEndHopsOf(StringValues forwardedFor) =>
        forwardedFor
            .SelectMany(line => (line ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Select(hop => IPEndPoint.TryParse(hop, out var endpoint) && IsGoogleFrontEnd(endpoint.Address))
            .ToList();

    private static bool IsGoogleFrontEnd(IPAddress peer)
    {
        var address = peer.IsIPv4MappedToIPv6 ? peer.MapToIPv4() : peer;
        return Array.Exists(GoogleFrontEndNetworksHostingCallsCloudRunFrom, network => network.Contains(address));
    }
}

using System.Net;

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

    internal static bool Carries(HttpContext httpContext)
    {
        var peer = httpContext.Connection.RemoteIpAddress;
        if (peer is null)
            return false;
        var address = peer.IsIPv4MappedToIPv6 ? peer.MapToIPv4() : peer;
        return Array.Exists(GoogleFrontEndNetworksHostingCallsCloudRunFrom, network => network.Contains(address));
    }
}

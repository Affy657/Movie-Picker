using System.Security.Cryptography;
using System.Text;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class EventHost
{
    public static bool IsHost(Event evt, string? hostToken, string? currentUserId) =>
        TokenMatches(hostToken, evt.HostToken)
        || (!string.IsNullOrEmpty(currentUserId) && currentUserId == evt.CreatorUserId);

    private static bool TokenMatches(string? presented, string expected)
    {
        if (string.IsNullOrEmpty(presented) || string.IsNullOrEmpty(expected))
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(presented),
            Encoding.UTF8.GetBytes(expected));
    }
}

using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Application.UseCases.Auth.Sessions;

public static class SessionPublicId
{
    public static string Of(string sessionKey) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sessionKey)), 0, 16).ToLowerInvariant();
}

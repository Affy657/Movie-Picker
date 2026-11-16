using System.Buffers.Text;
using System.Security.Cryptography;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public static class MovieListInviteToken
{
    private const int EntropyBytes = 18;

    public const int MaxLength = 64;

    public static string New() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(EntropyBytes));
}

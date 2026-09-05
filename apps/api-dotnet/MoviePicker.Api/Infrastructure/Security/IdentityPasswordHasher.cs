using Microsoft.AspNetCore.Identity;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class IdentityPasswordHasher : IPasswordHasher
{
    private static readonly object HashSubject = new();

    private readonly PasswordHasher<object> _identityHasher = new();

    public string Hash(string password) => _identityHasher.HashPassword(HashSubject, password);

    public PasswordVerification Verify(string hashedPassword, string providedPassword) =>
        _identityHasher.VerifyHashedPassword(HashSubject, hashedPassword, providedPassword) switch
        {
            PasswordVerificationResult.Success => PasswordVerification.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordVerification.SuccessNeedsRehash,
            _ => PasswordVerification.Failed
        };
}

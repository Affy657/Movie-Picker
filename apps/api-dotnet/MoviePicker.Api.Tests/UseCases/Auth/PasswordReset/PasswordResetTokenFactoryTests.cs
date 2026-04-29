using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public sealed class PasswordResetTokenFactoryTests
{
    [Fact]
    public void Generate_ProducesPlainTokenOf43BytesBase64Url()
    {
        var (plain, hash) = PasswordResetTokenFactory.Generate();
        Assert.Equal(43, plain.Length); // 32 bytes en base64url sans padding
        Assert.Matches("^[A-Za-z0-9_-]+$", plain);
        Assert.Equal(64, hash.Length); // SHA-256 hex
        Assert.Matches("^[a-f0-9]+$", hash);
    }

    [Fact]
    public void Generate_ProducesDistinctTokens()
    {
        var set = new HashSet<string>();
        for (var i = 0; i < 100; i++) set.Add(PasswordResetTokenFactory.Generate().Plain);
        Assert.Equal(100, set.Count);
    }

    [Fact]
    public void Hash_IsDeterministic()
    {
        const string plain = "abc";
        Assert.Equal(PasswordResetTokenFactory.Hash(plain), PasswordResetTokenFactory.Hash(plain));
    }
}

using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperTests
{
    [Fact]
    public void ToDomain_ToDocument_RoundTrip()
    {
        var user = new User
        {
            Id = "507f1f77bcf86cd799439011",
            Email = "test@example.com",
            PasswordHash = "hash",
            DisplayName = "Pseudo",
            UiTheme = UiThemePreference.Dark,
            LetterboxdPendingReconciliationCount = 2,
            CreatedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2025, 1, 2, 0, 0, 0, TimeSpan.Zero)
        };

        var doc = UserDocumentMapper.ToDocument(user);
        Assert.Equal("dark", doc.UiTheme);
        Assert.Equal(2, doc.LetterboxdPendingReconciliationCount);

        var back = UserDocumentMapper.ToDomain(doc);
        Assert.Equal(user.Id, back.Id);
        Assert.Equal(user.Email, back.Email);
        Assert.Equal(user.PasswordHash, back.PasswordHash);
        Assert.Equal(user.DisplayName, back.DisplayName);
        Assert.Equal(UiThemePreference.Dark, back.UiTheme);
        Assert.Equal(2, back.LetterboxdPendingReconciliationCount);
    }

    [Theory]
    [InlineData("light", UiThemePreference.Light)]
    [InlineData("dark", UiThemePreference.Dark)]
    [InlineData("system", UiThemePreference.System)]
    [InlineData("LIGHT", UiThemePreference.Light)]
    [InlineData("", UiThemePreference.System)]
    [InlineData(null, UiThemePreference.System)]
    public void ParseTheme(string? stored, UiThemePreference expected)
    {
        var doc = new UserDocument
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            UiTheme = stored ?? "system",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var u = UserDocumentMapper.ToDomain(doc);
        Assert.Equal(expected, u.UiTheme);
    }
}

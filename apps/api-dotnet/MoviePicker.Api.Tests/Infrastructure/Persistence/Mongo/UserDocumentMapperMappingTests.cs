using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperMappingTests
{
    private static readonly DateTime Utc = new(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("blue", AccentColor.Blue)]
    [InlineData("green", AccentColor.Green)]
    [InlineData("purple", AccentColor.Purple)]
    [InlineData("pink", AccentColor.Pink)]
    [InlineData("orange", AccentColor.Orange)]
    [InlineData("red", AccentColor.Red)]
    [InlineData("cyan", AccentColor.Cyan)]
    [InlineData("indigo", AccentColor.Indigo)]
    [InlineData("BLUE", AccentColor.Blue)]
    [InlineData("default", AccentColor.Default)]
    [InlineData("unknown", AccentColor.Default)]
    [InlineData(null, AccentColor.Default)]
    public void ParseAccent_MapsKnownColors(string? stored, AccentColor expected)
    {
        Assert.Equal(expected, UserDocumentMapper.ParseAccent(stored));
    }

    [Theory]
    [InlineData(AccentColor.Blue, "blue")]
    [InlineData(AccentColor.Green, "green")]
    [InlineData(AccentColor.Purple, "purple")]
    [InlineData(AccentColor.Pink, "pink")]
    [InlineData(AccentColor.Orange, "orange")]
    [InlineData(AccentColor.Red, "red")]
    [InlineData(AccentColor.Cyan, "cyan")]
    [InlineData(AccentColor.Indigo, "indigo")]
    [InlineData(AccentColor.Default, null)]
    public void AccentToString_MapsKnownColors(AccentColor color, string? expected)
    {
        Assert.Equal(expected, UserDocumentMapper.AccentToString(color));
    }

    [Theory]
    [InlineData("ten", RatingScale.Ten)]
    [InlineData("five", RatingScale.Five)]
    [InlineData("TEN", RatingScale.Ten)]
    [InlineData("unknown", RatingScale.Five)]
    [InlineData(null, RatingScale.Five)]
    public void ParseRatingScale_MapsKnownValues(string? stored, RatingScale expected)
    {
        Assert.Equal(expected, UserDocumentMapper.ParseRatingScale(stored));
    }

    [Theory]
    [InlineData(RatingScale.Ten, "ten")]
    [InlineData(RatingScale.Five, "five")]
    public void RatingScaleToString_MapsKnownValues(RatingScale scale, string expected)
    {
        Assert.Equal(expected, UserDocumentMapper.RatingScaleToString(scale));
    }

    [Fact]
    public void RatingScale_RoundTripsThroughDocument()
    {
        var user = new User
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            RatingScale = RatingScale.Ten,
            CreatedAt = new DateTimeOffset(Utc),
            UpdatedAt = new DateTimeOffset(Utc)
        };

        var back = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(user));

        Assert.Equal(RatingScale.Ten, back.RatingScale);
    }

    [Fact]
    public void ToDomain_NullableFieldsAbsent_AppliesDefaults()
    {
        var doc = new UserDocument
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            UiTheme = "system",
            CreatedAt = Utc,
            UpdatedAt = Utc
        };

        var user = UserDocumentMapper.ToDomain(doc);

        Assert.Equal(string.Empty, user.Handle);
        Assert.Null(user.Bio);
        Assert.True(user.IsProfilePublic);
        Assert.Equal(string.Empty, user.AvatarId);
        Assert.Equal(AccentColor.Default, user.AccentColor);
        Assert.Equal(RatingScale.Five, user.RatingScale);
        Assert.True(user.NotifyOnParticipantJoined);
        Assert.True(user.NotifyEventReminder);
        Assert.True(user.NotifyOnMovieAdded);
        Assert.True(user.NotifyOnMoviePicked);
        Assert.True(user.NotifyOnEventDeleted);
        Assert.True(user.NotifyOnNewFollower);
    }

    [Fact]
    public void ToDomain_NotificationFlagsDisabled_Preserved()
    {
        var doc = new UserDocument
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            UiTheme = "system",
            NotifyOnParticipantJoined = false,
            NotifyEventReminder = false,
            NotifyOnMovieAdded = false,
            NotifyOnMoviePicked = false,
            NotifyOnEventDeleted = false,
            NotifyOnNewFollower = false,
            IsProfilePublic = false,
            CreatedAt = Utc,
            UpdatedAt = Utc
        };

        var user = UserDocumentMapper.ToDomain(doc);

        Assert.False(user.IsProfilePublic);
        Assert.False(user.NotifyOnParticipantJoined);
        Assert.False(user.NotifyOnNewFollower);
    }

    [Fact]
    public void ToDocument_EmptyOptionalFields_StoredAsNull()
    {
        var user = new User
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            Handle = string.Empty,
            Bio = null,
            AvatarId = string.Empty,
            AccentColor = AccentColor.Default,
            IsProfilePublic = false,
            CreatedAt = new DateTimeOffset(Utc),
            UpdatedAt = new DateTimeOffset(Utc)
        };

        var doc = UserDocumentMapper.ToDocument(user);

        Assert.Null(doc.Handle);
        Assert.Null(doc.Bio);
        Assert.Null(doc.AvatarId);
        Assert.Null(doc.AccentColor);
        Assert.False(doc.IsProfilePublic);
    }

    [Fact]
    public void ToDocument_PopulatedFields_Persisted()
    {
        var user = new User
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            Handle = "alice",
            Bio = "hi",
            AvatarId = "bolt",
            UiTheme = UiThemePreference.Light,
            AccentColor = AccentColor.Purple,
            CreatedAt = new DateTimeOffset(Utc),
            UpdatedAt = new DateTimeOffset(Utc)
        };

        var doc = UserDocumentMapper.ToDocument(user);

        Assert.Equal("alice", doc.Handle);
        Assert.Equal("hi", doc.Bio);
        Assert.Equal("bolt", doc.AvatarId);
        Assert.Equal("light", doc.UiTheme);
        Assert.Equal("purple", doc.AccentColor);
    }

    [Fact]
    public void AccentColor_RoundTripsThroughDocument()
    {
        var user = new User
        {
            Id = "1",
            Email = "a@b.c",
            PasswordHash = "x",
            DisplayName = "n",
            AccentColor = AccentColor.Cyan,
            CreatedAt = new DateTimeOffset(Utc),
            UpdatedAt = new DateTimeOffset(Utc)
        };

        var back = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(user));

        Assert.Equal(AccentColor.Cyan, back.AccentColor);
    }
}

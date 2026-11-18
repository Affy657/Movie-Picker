using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class DisplayedPersonTests
{
    private static User Lea(bool isProfilePublic = true, AvatarPhoto? photo = null) => new()
    {
        Id = "u-lea",
        Handle = "lea",
        DisplayName = "Léa Moreau",
        AvatarId = "fox",
        IsProfilePublic = isProfilePublic,
        AvatarPhoto = photo
    };

    [Fact]
    public void From_AUserWithAnActivePhoto_ShowsThePhotoRatherThanTheGeneratedAvatar()
    {
        var photo = new AvatarPhoto { Key = "abc", IsActive = true };

        var person = DisplayedPerson.From(Lea(photo: photo));

        Assert.Equal(new DisplayedPerson("u-lea", "lea", "lea", "Léa Moreau", photo.AvatarId), person);
    }

    [Fact]
    public void From_APrivateProfile_KeepsTheHandleButNoPublicOne()
    {
        var person = DisplayedPerson.From(Lea(isProfilePublic: false));

        Assert.Equal(("lea", (string?)null, "fox"), (person.Handle, person.PublicHandle, person.AvatarId));
    }

    [Fact]
    public void From_ACardWithoutHandle_GivesAnEmptyHandleAndNoPublicOne()
    {
        var person = DisplayedPerson.From(new UserCard("u-sam", "owl", null, IsProfilePublic: true, "Sam"));

        Assert.Equal(new DisplayedPerson("u-sam", string.Empty, null, "Sam", "owl"), person);
    }

    [Fact]
    public void LinkedTo_AGuestParticipant_IsNobody()
    {
        var cards = new Dictionary<string, UserCard> { ["u-lea"] = new("u-lea", "fox", "lea", true, "Léa") };

        Assert.Null(DisplayedPerson.LinkedTo(new Participant { Pseudo = "Invité" }, cards));
        Assert.Equal("fox", DisplayedPerson.LinkedTo(new Participant { Pseudo = "Léa", UserId = "u-lea" }, cards)?.AvatarId);
    }
}

using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class UserDocumentMapperEventTemplatesTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 9, 10, 12, 0, 0, TimeSpan.Zero);

    private static User UserWith(params EventTemplate[] templates) =>
        new()
        {
            Id = "507f1f77bcf86cd799439011",
            Email = "test@example.com",
            EventTemplates = templates
        };

    [Fact]
    public void ToDocument_NoTemplates_WritesNothing()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith());

        Assert.Null(doc.EventTemplates);
    }

    [Fact]
    public void ToDomain_MissingTemplates_ReadsEmptyList()
    {
        var back = UserDocumentMapper.ToDomain(new UserDocument { Id = "507f1f77bcf86cd799439011" });

        Assert.Empty(back.EventTemplates);
    }

    [Fact]
    public void RoundTrip_PreservesEveryField()
    {
        var user = UserWith(new EventTemplate
        {
            Id = "tpl1",
            Name = "Soirée horreur",
            CreatedAt = CreatedAt,
            Config = new EventConfig
            {
                Theme = "🎃 Halloween",
                MaxProposalsPerParticipant = 3,
                MaxParticipants = 8,
                WheelMode = WheelMode.StrictRandom,
                AllowSeries = true
            }
        });

        var back = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(user));

        var template = Assert.Single(back.EventTemplates);
        Assert.Equal("tpl1", template.Id);
        Assert.Equal("Soirée horreur", template.Name);
        Assert.Equal(CreatedAt, template.CreatedAt);
        Assert.Equal("🎃 Halloween", template.Config.Theme);
        Assert.Equal(3, template.Config.MaxProposalsPerParticipant);
        Assert.Equal(8, template.Config.MaxParticipants);
        Assert.Equal(WheelMode.StrictRandom, template.Config.WheelMode);
        Assert.True(template.Config.AllowSeries);
    }

    [Fact]
    public void RoundTrip_KeepsOrderAndNullLimits()
    {
        var user = UserWith(
            new EventTemplate { Id = "t1", Name = "Premier", CreatedAt = CreatedAt },
            new EventTemplate { Id = "t2", Name = "Second", CreatedAt = CreatedAt });

        var back = UserDocumentMapper.ToDomain(UserDocumentMapper.ToDocument(user));

        Assert.Equal(["Premier", "Second"], back.EventTemplates.Select(t => t.Name));
        Assert.Null(back.EventTemplates[0].Config.Theme);
        Assert.Null(back.EventTemplates[0].Config.MaxParticipants);
    }

    [Fact]
    public void ToDocument_SerializesWheelModeAsString()
    {
        var doc = UserDocumentMapper.ToDocument(UserWith(new EventTemplate
        {
            Id = "t1",
            Name = "Premier",
            Config = new EventConfig { WheelMode = WheelMode.WeightedByVotes }
        }));

        Assert.Equal("weightedByVotes", Assert.Single(doc.EventTemplates!).Config.WheelMode);
    }
}

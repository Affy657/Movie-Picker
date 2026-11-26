using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AvatarPhotos;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AvatarPhotos;

public sealed class ReportProfilePhotoHandlerTests
{
    private const string ApiBase = "https://api.example.test";
    private const string ReporterId = "665f00000000000000000001";

    private static readonly DateTimeOffset Now = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryUserRepository _users = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly RecordingSharedQuota _quota = new();
    private readonly MoviePickerOptions _options = new() { ContactEmailAddress = "moderation@example.test" };
    private readonly CapturingLogger<ReportProfilePhotoHandler> _logs = new();
    private readonly List<EmailMessage> _sent = [];
    private readonly ReportProfilePhotoHandler _sut;

    public ReportProfilePhotoHandlerTests()
    {
        _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .Callback<EmailMessage, CancellationToken>((message, _) => _sent.Add(message))
            .Returns(Task.CompletedTask);
        _sut = new ReportProfilePhotoHandler(_users, _email.Object, _quota, Options.Create(_options), _logs);
    }

    private static string Key(char letter) => new(letter, 32);

    private async Task<User> OwnerAsync(Func<User, User>? photos = null, bool isPublic = true)
    {
        var user = new User
        {
            Email = "lea.moreau@example.test",
            DisplayName = "Léa Moreau",
            Handle = "lea" + Guid.NewGuid().ToString("N")[..6],
            AvatarId = "bolt",
            IsProfilePublic = isPublic,
            CreatedAt = Now,
            UpdatedAt = Now
        };
        return await _users.AddAsync(photos is null ? user : photos(user));
    }

    private static User WithAvatarPhoto(User user, bool isActive = true) =>
        user with { AvatarPhoto = new AvatarPhoto { Key = Key('a'), IsActive = isActive, UpdatedAt = Now } };

    private static User WithBannerPhoto(User user, bool shown = true) =>
        user with
        {
            BannerPhoto = new BannerPhoto { Key = Key('b'), UpdatedAt = Now },
            Banner = shown ? ProfileBanner.FromPhoto(Now) : ProfileBanner.FromFilm(693134, "Dune", "/dune.jpg", Now)
        };

    private Task ReportAsync(User owner, string photo, string reporterId = ReporterId) =>
        _sut.HandleAsync(reporterId, owner.Handle, new ReportProfilePhotoRequest { Photo = photo }, ApiBase);

    [Fact]
    public async Task Report_ShownAvatarPhoto_EmailsTheContactAddressWhatTheModerationNeeds()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));

        await ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto);

        var message = Assert.Single(_sent);
        Assert.Equal("moderation@example.test", message.ToEmail);
        Assert.Contains($"@{owner.Handle}", message.Subject);
        foreach (var body in new[] { message.TextBody, message.HtmlBody })
        {
            Assert.Contains($"https://www.movie-picker.fr/u/{owner.Handle}", body);
            Assert.Contains($"{ApiBase}/api/v1/avatars/{Key('a')}", body);
            Assert.Contains(ReporterId, body);
            Assert.Contains($"pnpm run photo:remove -- --handle {owner.Handle} --photo avatar", body);
        }
    }

    [Fact]
    public async Task Report_ShownBannerPhoto_PointsToTheBannerAndItsRemoval()
    {
        var owner = await OwnerAsync(user => WithBannerPhoto(user));

        await ReportAsync(owner, ReportProfilePhotoRequest.BannerPhoto);

        var message = Assert.Single(_sent);
        Assert.Contains($"{ApiBase}/api/v1/banners/{Key('b')}", message.TextBody);
        Assert.Contains($"pnpm run photo:remove -- --handle {owner.Handle} --photo banner", message.TextBody);
        Assert.Contains($"@{owner.Handle}", message.Subject);
    }

    [Fact]
    public async Task Report_SaysNothingAboutTheReporterButTheirInternalId()
    {
        var reporter = await _users.AddAsync(new User
        {
            Email = "sam.signaleur@example.test",
            DisplayName = "Sam Signaleur",
            Handle = "samsignaleur",
            CreatedAt = Now,
            UpdatedAt = Now
        });
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));

        await ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto, reporter.Id);

        var message = Assert.Single(_sent);
        foreach (var text in new[] { message.Subject, message.TextBody, message.HtmlBody })
        {
            Assert.DoesNotContain("sam.signaleur", text);
            Assert.DoesNotContain("Signaleur", text);
            Assert.DoesNotContain("samsignaleur", text);
        }
        Assert.Contains(reporter.Id, message.TextBody);
    }

    [Fact]
    public async Task Report_OwnPhoto_IsRefused()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));

        var error = await Assert.ThrowsAsync<BadRequestException>(
            () => ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto, owner.Id));

        Assert.Equal(ErrorCodes.SelfPhotoReport, error.Reason);
        Assert.Empty(_sent);
    }

    [Fact]
    public async Task Report_PrivateProfile_IsNotFound()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user), isPublic: false);

        var error = await Assert.ThrowsAsync<NotFoundException>(() => ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto));

        Assert.Equal(ErrorCodes.ProfileNotFound, error.Reason);
        Assert.Empty(_sent);
    }

    public static TheoryData<string, bool> PhotosNoLongerShown() => new()
    {
        { ReportProfilePhotoRequest.AvatarPhoto, false },
        { ReportProfilePhotoRequest.BannerPhoto, false },
        { ReportProfilePhotoRequest.AvatarPhoto, true },
        { ReportProfilePhotoRequest.BannerPhoto, true }
    };

    [Theory]
    [MemberData(nameof(PhotosNoLongerShown))]
    public async Task Report_PhotoNoLongerShown_SendsNothing(string photo, bool keptAside)
    {
        var owner = await OwnerAsync(user => keptAside ? WithBannerPhoto(WithAvatarPhoto(user, isActive: false), shown: false) : user);

        await ReportAsync(owner, photo);

        Assert.Empty(_sent);
        Assert.Empty(_quota.Calls);
    }

    [Fact]
    public async Task Report_SendsOneEmailPerPhotoAndPerDay()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));

        await ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto);

        var perPhoto = _quota.Calls.First();
        Assert.Equal(ReportProfilePhotoHandler.ReportedPhotoScope, perPhoto.Scope);
        Assert.Equal(Key('a'), perPhoto.Subject);
        Assert.Equal(1, perPhoto.Limit);
        Assert.Equal(TimeSpan.FromDays(1), perPhoto.Window);
        Assert.Contains(_quota.Calls, call =>
            call.Scope == ReportProfilePhotoHandler.ModerationEmailScope
            && call.Limit == ReportProfilePhotoHandler.MaxModerationEmailsPerDay
            && call.Window == TimeSpan.FromDays(1));
    }

    [Fact]
    public async Task Report_PhotoAlreadyReportedToday_IsOnlyLogged()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));
        _quota.Allows = false;

        await ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto);

        Assert.Empty(_sent);
        Assert.Contains(
            _logs.States.SelectMany(state => state),
            pair => pair.Key == "{OriginalFormat}" && Equals(pair.Value, ReportProfilePhotoHandler.ReportedLogMessage));
    }

    [Fact]
    public async Task Report_EmailThatCannotLeave_IsLoggedAsAnErrorAndTheReportStillAccepted()
    {
        var owner = await OwnerAsync(user => WithAvatarPhoto(user));
        _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmailDeliveryException("Resend returned 500", statusCode: 500));

        await ReportAsync(owner, ReportProfilePhotoRequest.AvatarPhoto);

        Assert.Contains(_logs.Entries, entry => entry.Level == LogLevel.Error);
    }
}

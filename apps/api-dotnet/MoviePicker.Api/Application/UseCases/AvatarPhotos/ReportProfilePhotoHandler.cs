using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AvatarPhotos;

public interface IReportProfilePhotoHandler
{
    Task HandleAsync(
        string reporterId,
        string handle,
        ReportProfilePhotoRequest request,
        string apiPublicBaseUrl,
        CancellationToken ct = default);
}

public sealed class ReportProfilePhotoHandler : IReportProfilePhotoHandler
{
    public const string ReportedPhotoScope = "photo-report";
    public const string ModerationEmailScope = "photo-report-email";
    public const int MaxModerationEmailsPerDay = 20;
    public const string ReportedLogTemplate = "PhotoReport: the {Photo} {Key} of {OwnerId} was reported by {ReporterId}";

    private const string EmailTag = "photo-report";
    private const string ModerationInbox = "moderation";
    private const string AvatarImagePath = "/api/v1/avatars/";
    private const string BannerImagePath = "/api/v1/banners/";

    private static readonly TimeSpan Day = TimeSpan.FromDays(1);

    private readonly IUserRepository _users;
    private readonly IEmailSender _email;
    private readonly ISharedQuota _quota;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<ReportProfilePhotoHandler> _logger;

    public ReportProfilePhotoHandler(
        IUserRepository users,
        IEmailSender email,
        ISharedQuota quota,
        IOptions<MoviePickerOptions> options,
        ILogger<ReportProfilePhotoHandler> logger)
    {
        _users = users;
        _email = email;
        _quota = quota;
        _options = options.Value;
        _logger = logger;
    }

    public async Task HandleAsync(
        string reporterId,
        string handle,
        ReportProfilePhotoRequest request,
        string apiPublicBaseUrl,
        CancellationToken ct = default)
    {
        var owner = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        if (owner.Id == reporterId)
            throw Errors.SelfPhotoReport();

        if (ShownPhoto(owner, request.Photo) is not { } photo)
        {
            _logger.LogInformation("PhotoReport: a photo of {OwnerId} no longer shown was reported", owner.Id);
            return;
        }

        _logger.LogInformation(ReportedLogTemplate, photo.Kind, photo.Key, owner.Id, reporterId);
        if (!await _quota.TryConsumeAsync(ReportedPhotoScope, photo.Key, 1, Day, ct))
            return;
        if (!await _quota.TryConsumeAsync(ModerationEmailScope, ModerationInbox, MaxModerationEmailsPerDay, Day, ct))
        {
            _logger.LogWarning(
                "PhotoReport: {Max} moderation e-mails already left today, the report of {Key} is only logged",
                MaxModerationEmailsPerDay,
                photo.Key);
            return;
        }

        await SendAsync(owner, photo, reporterId, apiPublicBaseUrl, ct);
    }

    private static ReportedPhoto? ShownPhoto(User owner, string photo) => photo switch
    {
        ReportProfilePhotoRequest.AvatarPhoto when owner.AvatarPhoto is { IsActive: true } avatar =>
            new ReportedPhoto(ReportProfilePhotoRequest.AvatarPhoto, avatar.Key, AvatarImagePath + avatar.Key, ServerCopy.PhotoReportEmail.AvatarPhoto),
        ReportProfilePhotoRequest.BannerPhoto when owner is { Banner.Source: ProfileBannerSource.Photo, BannerPhoto: { } banner } =>
            new ReportedPhoto(ReportProfilePhotoRequest.BannerPhoto, banner.Key, BannerImagePath + banner.Key, ServerCopy.PhotoReportEmail.BannerPhoto),
        _ => null
    };

    private async Task SendAsync(User owner, ReportedPhoto photo, string reporterId, string apiPublicBaseUrl, CancellationToken ct)
    {
        var siteUrl = _options.ResolvedWebBaseUrl();
        var profileUrl = siteUrl + FrontRoutes.Profile(owner.Handle);
        var imageUrl = apiPublicBaseUrl.Trim().TrimEnd('/') + photo.ImagePath;
        var removal = $"pnpm run photo:remove -- --handle {owner.Handle} --photo {photo.Kind}";
        var message = new EmailMessage(
            _options.ContactEmailAddress,
            ServerCopy.PhotoReportEmail.Subject(photo.Label, owner.Handle),
            ServerCopy.PhotoReportEmail.HtmlBody(photo.Label, owner.Handle, profileUrl, imageUrl, reporterId, removal, siteUrl),
            ServerCopy.PhotoReportEmail.TextBody(photo.Label, owner.Handle, profileUrl, imageUrl, reporterId, removal),
            EmailTag);
        try
        {
            await _email.SendAsync(message, ct);
        }
        catch (EmailDeliveryException ex)
        {
            _logger.LogError(
                ex,
                "PhotoReport: the moderation e-mail about the {Photo} {Key} of {OwnerId} could not be sent",
                photo.Kind,
                photo.Key,
                owner.Id);
        }
    }

    private sealed record ReportedPhoto(string Kind, string Key, string ImagePath, string Label);
}

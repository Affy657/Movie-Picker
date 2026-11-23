using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ProfileShare;

public sealed class GetProfileShareDocumentHandler : IGetProfileShareDocumentHandler
{
    private const string ProfileType = "profile";

    private readonly IUserRepository _users;
    private readonly IWebShellSource _shell;
    private readonly MoviePickerOptions _options;

    public GetProfileShareDocumentHandler(
        IUserRepository users,
        IWebShellSource shell,
        IOptions<MoviePickerOptions> options)
    {
        _users = users;
        _shell = shell;
        _options = options.Value;
    }

    public async Task<ShareDocument> HandleAsync(string handle, string apiPublicBaseUrl, CancellationToken ct = default)
    {
        var webBase = _options.ResolvedWebBaseUrl();
        var user = await _users.GetByHandleAsync(HandlePolicy.Normalize(handle), ct);
        var member = user is { IsProfilePublic: true } ? user : null;
        var preview = member is null
            ? SharePreview.Generic(webBase)
            : Describe(member, webBase, apiPublicBaseUrl.Trim().TrimEnd('/'));
        var html = SharePreviewHead.Render(await _shell.GetShellAsync(ct), preview);
        return new ShareDocument(member is null ? 404 : 200, html);
    }

    private static SharePreview Describe(User user, string webBase, string apiBase)
    {
        var person = DisplayedPerson.From(user);
        var canonical = webBase + FrontRoutes.Profile(person.Handle);
        var image = BannerImage(user, apiBase);
        return new SharePreview(
            canonical,
            webBase + FrontRoutes.Home,
            ServerCopy.SharePreviews.ProfileTitle(person.DisplayName, person.Handle),
            Describe(user.Bio, person),
            image ?? SharePreview.SiteImage(webBase),
            image is null ? SharePreview.SiteName : ServerCopy.SharePreviews.BannerOf(person.DisplayName))
        {
            OgType = ProfileType,
            Indexable = true
        };
    }

    private static string? BannerImage(User user, string apiBase)
    {
        var imageUrl = ProfileBannerResponse.From(user)?.ImageUrl;
        if (string.IsNullOrEmpty(imageUrl))
            return null;
        return imageUrl.StartsWith('/') ? apiBase + imageUrl : imageUrl;
    }

    private static string Describe(string? bio, DisplayedPerson person)
    {
        var text = bio?.Trim();
        return string.IsNullOrEmpty(text)
            ? ServerCopy.SharePreviews.ProfileDescription(person.DisplayName, person.Handle)
            : SharePreviewContent.Excerpt(text);
    }
}

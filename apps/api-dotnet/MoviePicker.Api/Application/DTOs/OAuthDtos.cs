namespace MoviePicker.Api.Application.DTOs;

public sealed record ExternalLoginInfo
{
    public string Provider { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string? Email { get; init; }
    public bool EmailVerified { get; init; }
    public string DisplayName { get; init; } = string.Empty;
}

public enum OAuthOutcomeKind
{
    SignedIn,
    Linked,
    EmailNotVerified,
    IdentityLinkedToOtherAccount
}

public sealed record OAuthOutcome
{
    public required OAuthOutcomeKind Kind { get; init; }
    public MoviePicker.Api.Domain.Entities.User? User { get; init; }
    public bool IsNewAccount { get; init; }
}

public sealed record OAuthProvidersResponse
{
    public IReadOnlyCollection<string> Providers { get; init; } = Array.Empty<string>();
}

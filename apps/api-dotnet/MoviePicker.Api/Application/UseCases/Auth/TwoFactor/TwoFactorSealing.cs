namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public static class TwoFactorSealing
{
    public const string SecretPurpose = "MoviePicker.TwoFactor.Secret";
    public const string SetupPurpose = "MoviePicker.TwoFactor.Setup";
    public const string ChallengePurpose = "MoviePicker.TwoFactor.Challenge";
    public const int MaxAttemptsPerChallenge = 5;

    public static readonly TimeSpan SetupLifetime = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(10);
}

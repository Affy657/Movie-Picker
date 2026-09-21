using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class SchedulerCallerAuthenticator(
    ISchedulerTokenValidator sharedTokenValidator,
    IGoogleOidcSchedulerTokenValidator oidcTokenValidator) : ISchedulerCallerAuthenticator
{
    public async Task<SchedulerCallerVerdict> AuthenticateAsync(SchedulerCallerCredentials credentials, CancellationToken ct)
    {
        if (!sharedTokenValidator.IsConfigured && !oidcTokenValidator.IsConfigured)
            return SchedulerCallerVerdict.NotConfigured;

        if (oidcTokenValidator.IsConfigured && await oidcTokenValidator.IsValidAsync(credentials.BearerToken, ct))
            return SchedulerCallerVerdict.Accepted;

        if (sharedTokenValidator.IsConfigured && sharedTokenValidator.IsValid(credentials.SharedToken))
            return SchedulerCallerVerdict.Accepted;

        return SchedulerCallerVerdict.Refused;
    }
}

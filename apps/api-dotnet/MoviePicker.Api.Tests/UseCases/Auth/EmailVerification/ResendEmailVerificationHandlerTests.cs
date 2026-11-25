using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.EmailVerification;

public sealed class ResendEmailVerificationHandlerTests
{
    [Fact]
    public async Task HandleAsync_SignedInAccount_SendsItsConfirmationEmailInTheAskedLanguage()
    {
        var users = new InMemoryUserRepository();
        var user = await users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        var mailer = new Mock<IEmailVerificationMailer>();

        await new ResendEmailVerificationHandler(users, mailer.Object)
            .HandleAsync(user.Id, new EmailVerificationRequest { Locale = "en" });

        mailer.Verify(m => m.SendAsync(It.Is<User>(u => u.Id == user.Id), "en", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AccountGone_IsRefusedWithoutSendingAnything()
    {
        var mailer = new Mock<IEmailVerificationMailer>();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            new ResendEmailVerificationHandler(new InMemoryUserRepository(), mailer.Object)
                .HandleAsync("gone", new EmailVerificationRequest()));

        Assert.Equal(ErrorCodes.UserNotFound, ex.Reason);
        mailer.VerifyNoOtherCalls();
    }
}

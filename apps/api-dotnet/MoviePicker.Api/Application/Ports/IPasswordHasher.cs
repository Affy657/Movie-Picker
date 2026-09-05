namespace MoviePicker.Api.Application.Ports;

public enum PasswordVerification
{
    Failed,
    Success,
    SuccessNeedsRehash
}

public interface IPasswordHasher
{
    string Hash(string password);

    PasswordVerification Verify(string hashedPassword, string providedPassword);
}

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class WinnerSlots
{
    public const string NothingLeftToDrawMessage =
        "Tous les films proposés ont déjà gagné. Proposez un film de plus, ou retirez-en un du palmarès.";

    public const string AlreadyAWinnerMessage = "Ce film fait déjà partie des gagnants de la soirée.";

    public static string AllDrawnMessage(int targetWinnerCount) =>
        targetWinnerCount == 1
            ? "Le film gagnant de la soirée est déjà désigné. Montez le réglage, ou retirez-le du palmarès."
            : $"Les {targetWinnerCount} films gagnants de la soirée sont déjà désignés. Montez le réglage, ou retirez-en un du palmarès.";
}

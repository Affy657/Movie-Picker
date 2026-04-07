namespace MoviePicker.Api.Domain.Entities;

/// <summary>Mode de tirage pour la roue (V1 § config hôte).</summary>
public enum WheelMode
{
    /// <summary>Chaque film a la même probabilité.</summary>
    StrictRandom,

    /// <summary>Probabilité proportionnelle au score de votes (net up-down, minimum 1).</summary>
    WeightedByVotes
}

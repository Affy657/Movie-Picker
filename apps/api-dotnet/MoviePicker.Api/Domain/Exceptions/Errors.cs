namespace MoviePicker.Api.Domain.Exceptions;

public static class Errors
{
    public static NotFoundException EventNotFound() =>
        new("Movie night not found", ErrorCodes.EventNotFound);

    public static NotFoundException UserNotFound() =>
        new("User not found", ErrorCodes.UserNotFound);

    public static NotFoundException ProfileNotFound() =>
        new("Profile not found", ErrorCodes.ProfileNotFound);

    public static NotFoundException MovieNotFound() =>
        new("Movie not found", ErrorCodes.MovieNotFound);

    public static NotFoundException MovieNotInEvent() =>
        new("Movie not found in this movie night", ErrorCodes.MovieNotInEvent);

    public static NotFoundException MovieNotAWinner() =>
        new("This movie is not one of the winners of the movie night", ErrorCodes.MovieNotAWinner);

    public static NotFoundException ParticipantNotFound() =>
        new("Participant not found", ErrorCodes.ParticipantNotFound);

    public static NotFoundException WatchlistNotFound() =>
        new("Watchlist not found", ErrorCodes.WatchlistNotFound);

    public static NotFoundException SeenMarkNotFound() =>
        new("Seen mark not found", ErrorCodes.SeenMarkNotFound);

    public static NotFoundException EventTemplateNotFound() =>
        new("Movie night template not found", ErrorCodes.EventTemplateNotFound);

    public static NotFoundException OAuthProviderNotLinked() =>
        new("This account is not linked to this provider", ErrorCodes.OAuthProviderNotLinked);

    public static ConflictException EventFinished() =>
        new("Movie night is over, it is read-only", ErrorCodes.EventFinished);

    public static ConflictException EventClosedParticipantsLocked() =>
        new("Movie night is closed, the participant list can no longer change", ErrorCodes.EventClosedParticipantsLocked);

    public static ConflictException ParticipantsLockedWheel() =>
        new("The wheel has already been spun, the participant list can no longer change", ErrorCodes.ParticipantsLockedWheel);

    public static ConflictException TvShowsNotAllowed() =>
        new("This movie night does not allow TV shows", ErrorCodes.TvShowsNotAllowed);

    public static ConflictException MovieAlreadyProposed() =>
        new("This movie has already been proposed (same TMDB id)", ErrorCodes.MovieAlreadyProposed);

    public static ConflictException MovieTitleAlreadyProposed() =>
        new("A movie with this title has already been proposed", ErrorCodes.MovieTitleAlreadyProposed);

    public static ConflictException ProposalLimitReached(int max) =>
        new($"Limit of {max} proposal(s) per participant reached", ErrorCodes.ProposalLimitReached, Params(("max", max)));

    public static ConflictException VoteLimitReached(int max) =>
        new($"Limit of {max} vote(s) per participant reached", ErrorCodes.VoteLimitReached, Params(("max", max)));

    public static ConflictException OAuthLinkFailed() =>
        new("This account could not be linked, please retry", ErrorCodes.OAuthLinkFailed);

    public static ConflictException HandleTaken() =>
        new("This handle is already taken", ErrorCodes.HandleTaken);

    public static ConflictException IdentityConflict() =>
        new("This external identity is already linked to another account", ErrorCodes.IdentityConflict);

    public static ConflictException EmailTaken() =>
        new("An account already exists for this e-mail address", ErrorCodes.EmailTaken);

    public static ConflictException EventConfigLockedFinished() =>
        new("Movie night is over, its settings can no longer change", ErrorCodes.EventConfigLockedFinished);

    public static ConflictException EventConfigLockedWheel() =>
        new("The wheel has already been spun, the settings can no longer change", ErrorCodes.EventConfigLockedWheel);

    public static ConflictException EventDateLockedFinished() =>
        new("Movie night is over, its date can no longer change", ErrorCodes.EventDateLockedFinished);

    public static ConflictException EventTitleLockedFinished() =>
        new("Movie night is over, its name can no longer change", ErrorCodes.EventTitleLockedFinished);

    public static ConflictException RecurrenceNextOccurrenceExists() =>
        new("The next occurrence already exists, the recurrence is now set on that movie night", ErrorCodes.RecurrenceNextOccurrenceExists);

    public static ConflictException WinnerCountLockedFinished() =>
        new("Movie night is over, the number of winning movies can no longer change", ErrorCodes.WinnerCountLockedFinished);

    public static ConflictException WinnerCountBelowDrawn(int drawn) =>
        new($"{drawn} movie(s) already won, remove one from the winners first", ErrorCodes.WinnerCountBelowDrawn, Params(("count", drawn)));

    public static ConflictException ParticipantLimitBelowCurrent(int limit, int current) =>
        new($"The limit ({limit}) is below the number of participants already in ({current})", ErrorCodes.ParticipantLimitBelowCurrent, Params(("limit", limit), ("current", current)));

    public static ConflictException EventTemplateNameTaken(string name) =>
        new($"A template named \"{name}\" already exists", ErrorCodes.EventTemplateNameTaken, Params(("name", name)));

    public static ConflictException EventTemplateLimitReached(int max) =>
        new($"You reached the limit of {max} templates, delete one to save a new one", ErrorCodes.EventTemplateLimitReached, Params(("max", max)));

    public static ConflictException InviteEventFinished() =>
        new("Cannot invite, the movie night is over", ErrorCodes.InviteEventFinished);

    public static ConflictException AlreadyParticipant() =>
        new("This user already takes part in the movie night", ErrorCodes.AlreadyParticipant);

    public static ConflictException InvitationAlreadySent() =>
        new("An invitation has already been sent to this user for this movie night", ErrorCodes.InvitationAlreadySent);

    public static ConflictException EventFull(int cap) =>
        new($"Movie night is full ({cap} participants maximum)", ErrorCodes.EventFull, Params(("max", cap)));

    public static ConflictException WinnersAllDrawn(int target) =>
        new($"The {target} winning movie(s) of the movie night are already set, raise the setting or remove one from the winners", ErrorCodes.WinnersAllDrawn, Params(("count", target)));

    public static ConflictException HandleAllocationFailed() =>
        new("Could not allocate a unique handle, please retry", ErrorCodes.HandleAllocationFailed);

    public static ConflictException CreatorCannotBeRemoved() =>
        new("The creator of the movie night cannot be removed", ErrorCodes.CreatorCannotBeRemoved);

    public static ConflictException MovieExcludedFromWheel() =>
        new("This movie is excluded from the draw, put it back in to pick it", ErrorCodes.MovieExcludedFromWheel);

    public static ConflictException MovieAlreadyAWinner() =>
        new("This movie is already one of the winners of the movie night", ErrorCodes.MovieAlreadyAWinner);

    public static ConflictException WheelLocked() =>
        new("The wheel has already been spun, it is read-only", ErrorCodes.WheelLocked);

    public static ConflictException WheelLockedDelete() =>
        new("The wheel has already been spun, removal is impossible", ErrorCodes.WheelLockedDelete);

    public static ConflictException ConcurrentUpdate() =>
        new("Modified in the meantime, reload the page and retry", ErrorCodes.ConcurrentUpdate);

    public static ForbiddenException HostOnly() =>
        new("Reserved to the host of the movie night", ErrorCodes.HostOnly);

    public static ForbiddenException OwnParticipationOnly() =>
        new("You can only propose a movie for your own participation", ErrorCodes.OwnParticipationOnly);

    public static ForbiddenException MovieRemovalRestricted() =>
        new("Only the participant who proposed this movie or the host can remove it", ErrorCodes.MovieRemovalRestricted);

    public static ForbiddenException PitchNoteDeletionRestricted() =>
        new("Only the participant who proposed this movie or the host can delete the note", ErrorCodes.PitchNoteDeletionRestricted);

    public static ForbiddenException PitchNoteEditRestricted() =>
        new("Only the participant who proposed this movie can edit its note", ErrorCodes.PitchNoteEditRestricted);

    public static ForbiddenException CreatorOnlyDelete() =>
        new("Only the creator of the movie night can delete it", ErrorCodes.CreatorOnlyDelete);

    public static ForbiddenException HostOnlyInvite() =>
        new("Only the host can send invitations", ErrorCodes.HostOnlyInvite);

    public static ForbiddenException HostOnlyList() =>
        new("Only the host can view this list", ErrorCodes.HostOnlyList);

    public static ForbiddenException HostOrSelfOnly() =>
        new("Reserved to the host or to the participant themselves", ErrorCodes.HostOrSelfOnly);

    public static ForbiddenException SeenMarkOwnOnly() =>
        new("You can only change your own seen mark", ErrorCodes.SeenMarkOwnOnly);

    public static ForbiddenException SeenMarkOwnParticipationOnly() =>
        new("You can only mark a movie as seen for your own participation", ErrorCodes.SeenMarkOwnParticipationOnly);

    public static ForbiddenException VoteOwnOnly() =>
        new("You can only change your own vote", ErrorCodes.VoteOwnOnly);

    public static ForbiddenException VoteOwnParticipationOnly() =>
        new("You can only vote for your own participation", ErrorCodes.VoteOwnParticipationOnly);

    public static UnauthorizedException InvalidCredentials() =>
        new("Invalid credentials", ErrorCodes.InvalidCredentials);

    public static UnauthorizedException AccountRequired() =>
        new("An account is required", ErrorCodes.AccountRequired);

    public static UnauthorizedException WrongPassword() =>
        new("Wrong password", ErrorCodes.WrongPassword);

    public static UnauthorizedException CurrentPasswordIncorrect() =>
        new("Current password is incorrect", ErrorCodes.CurrentPasswordIncorrect);

    public static UnauthorizedException ConfirmationIncorrect() =>
        new("Confirmation is incorrect", ErrorCodes.ConfirmationIncorrect);

    public static ForbiddenException ReauthenticationRequired() =>
        new("A recent sign-in is required", ErrorCodes.ReauthenticationRequired);

    public static BadRequestException InvalidParticipant() =>
        new("Invalid participant for this movie night", ErrorCodes.InvalidParticipant);

    public static BadRequestException ParticipantRequired() =>
        new("Participant required", ErrorCodes.ParticipantRequired);

    public static BadRequestException ParticipantIdRequired() =>
        new("The participantId parameter is required", ErrorCodes.ParticipantIdRequired);

    public static BadRequestException InvalidPosterPath() =>
        new("posterPath must be an https TMDB poster URL, an /api/v1/posters/ path or null", ErrorCodes.InvalidPosterPath);

    public static BadRequestException PasswordTooShort(int min) =>
        new($"Password must be at least {min} characters long", ErrorCodes.PasswordTooShort, Params(("min", min)));

    public static BadRequestException PasswordTooLong(int max) =>
        new($"Password cannot exceed {max} characters", ErrorCodes.PasswordTooLong, Params(("max", max)));

    public static BadRequestException PasswordNeedsLetter() =>
        new("Password must contain at least one letter", ErrorCodes.PasswordNeedsLetter);

    public static BadRequestException PasswordNeedsDigit() =>
        new("Password must contain at least one digit", ErrorCodes.PasswordNeedsDigit);

    public static BadRequestException DisplayNameRequired() =>
        new("Display name is required", ErrorCodes.DisplayNameRequired);

    public static BadRequestException DisplayNameTooLong(int max) =>
        new($"Display name cannot exceed {max} characters", ErrorCodes.DisplayNameTooLong, Params(("max", max)));

    public static BadRequestException HandleRequired() =>
        new("Handle is required", ErrorCodes.HandleRequired);

    public static BadRequestException HandleTooShort(int min) =>
        new($"Handle must be at least {min} characters long", ErrorCodes.HandleTooShort, Params(("min", min)));

    public static BadRequestException HandleTooLong(int max) =>
        new($"Handle cannot exceed {max} characters", ErrorCodes.HandleTooLong, Params(("max", max)));

    public static BadRequestException HandleInvalidCharacters() =>
        new("Handle can only contain lowercase letters, digits and underscores", ErrorCodes.HandleInvalidCharacters);

    public static BadRequestException HandleReserved() =>
        new("This handle is reserved", ErrorCodes.HandleReserved);

    public static BadRequestException BioTooLong(int max) =>
        new($"Bio cannot exceed {max} characters", ErrorCodes.BioTooLong, Params(("max", max)));

    public static BadRequestException InvalidResetToken() =>
        new("Invalid or expired token", ErrorCodes.InvalidResetToken);

    public static BadRequestException LetterboxdUsernameInvalid() =>
        new("Letterboxd username can only contain letters, digits and underscores", ErrorCodes.LetterboxdUsernameInvalid);

    public static BadRequestException LetterboxdUsernameMissing() =>
        new("No Letterboxd username saved on your account", ErrorCodes.LetterboxdUsernameMissing);

    public static BadRequestException LetterboxdSyncFailed(string? reason) =>
        new("Letterboxd synchronization failed", reason ?? ErrorCodes.LetterboxdSyncFailed);

    public static BadRequestException InvalidDateFormat() =>
        new("date must use the YYYY-MM-DD format", ErrorCodes.InvalidDateFormat);

    public static BadRequestException InvalidTimeFormat() =>
        new("time must use the HH:mm format", ErrorCodes.InvalidTimeFormat);

    public static BadRequestException ThemeColorOutOfRange() =>
        new("themeColor must be a hue between 0 and 359", ErrorCodes.ThemeColorOutOfRange);

    public static BadRequestException EventTitleRequired() =>
        new("Movie night title cannot be empty", ErrorCodes.EventTitleRequired);

    public static BadRequestException EventTitleTooLong(int max) =>
        new($"Movie night title cannot exceed {max} characters", ErrorCodes.EventTitleTooLong, Params(("max", max)));

    public static BadRequestException EventTemplateNameRequired() =>
        new("Template name cannot be empty", ErrorCodes.EventTemplateNameRequired);

    public static BadRequestException EventTemplateNameTooLong(int max) =>
        new($"Template name cannot exceed {max} characters", ErrorCodes.EventTemplateNameTooLong, Params(("max", max)));

    public static BadRequestException SelfFollow() =>
        new("You cannot follow yourself", ErrorCodes.SelfFollow);

    public static BadRequestException UnknownSection() =>
        new("Unknown section", ErrorCodes.UnknownSection);

    public static BadRequestException UnknownPlatform() =>
        new("Unknown platform", ErrorCodes.UnknownPlatform);

    public static BadRequestException ReferenceMovieMissing() =>
        new("Reference movie missing", ErrorCodes.ReferenceMovieMissing);

    public static BadRequestException CollectionIdMissing() =>
        new("Collection id missing", ErrorCodes.CollectionIdMissing);

    public static BadRequestException UnknownTheme() =>
        new("Unknown theme", ErrorCodes.UnknownTheme);

    public static BadRequestException TooManyAttachments(int max) =>
        new($"Too many attachments (maximum {max})", ErrorCodes.TooManyAttachments, Params(("max", max)));

    public static BadRequestException AttachmentContentInvalid(string fileName) =>
        new($"Invalid content (malformed base64) for \"{fileName}\"", ErrorCodes.AttachmentContentInvalid, Params(("name", fileName)));

    public static BadRequestException AttachmentImageUnreadable(string fileName) =>
        new($"The image \"{fileName}\" could not be read", ErrorCodes.AttachmentImageUnreadable, Params(("name", fileName)));

    public static BadRequestException AttachmentContentMismatch(string fileName, string contentType) =>
        new($"The content of \"{fileName}\" does not match the declared format ({contentType})", ErrorCodes.AttachmentContentMismatch, Params(("name", fileName), ("type", contentType)));

    public static BadRequestException InviteOnlyFollowed() =>
        new("You can only invite users you follow", ErrorCodes.InviteOnlyFollowed);

    public static BadRequestException NoMovieProposed() =>
        new("No movie proposed, propose at least one movie to spin the wheel", ErrorCodes.NoMovieProposed);

    public static BadRequestException AllMoviesExcluded() =>
        new("Every movie is excluded from the draw, put at least one back in to spin the wheel", ErrorCodes.AllMoviesExcluded);

    public static BadRequestException NothingLeftToDraw() =>
        new("Every proposed movie already won, propose one more or remove one from the winners", ErrorCodes.NothingLeftToDraw);

    public static BadRequestException TooManySelections(int max) =>
        new($"Too many selected items (maximum {max})", ErrorCodes.TooManySelections, Params(("max", max)));

    public static BadRequestException UnknownNotificationType(string type) =>
        new($"Unknown notification type: \"{type}\"", ErrorCodes.UnknownNotificationType, Params(("type", type)));

    public static BadRequestException NotificationEnabledRequired(string type) =>
        new($"\"enabled\" is required for the type \"{type}\"", ErrorCodes.NotificationEnabledRequired, Params(("type", type)));

    public static BadRequestException InvalidPushEndpoint() =>
        new("endpoint must be an https URL of a public push service", ErrorCodes.InvalidPushEndpoint);

    public static BadRequestException PitchNoteTooLong(int max) =>
        new($"Pitch note cannot exceed {max} characters", ErrorCodes.PitchNoteTooLong, Params(("max", max)));

    public static BadRequestException ConfigLimitInvalid(string field) =>
        new($"{field} must be 0 (no limit) or a positive integer", ErrorCodes.ConfigLimitInvalid, Params(("field", field)));

    public static BadRequestException ConfigLimitOutOfRange(string field, int max) =>
        new($"{field} must be between 0 (no limit) and {max}", ErrorCodes.ConfigLimitOutOfRange, Params(("field", field), ("max", max)));

    public static BadRequestException WinnerCountOutOfRange(int min, int max) =>
        new($"The number of winning movies must be between {min} and {max}", ErrorCodes.WinnerCountOutOfRange, Params(("min", min), ("max", max)));

    public static BadRequestException LastLoginMethod() =>
        new("The last sign-in method of the account cannot be removed", ErrorCodes.LastLoginMethod);

    public static ServiceUnavailableException MovieDetailsUnavailable() =>
        new("Movie details temporarily unavailable", ErrorCodes.MovieDetailsUnavailable);

    public static ServiceUnavailableException ShowcaseUnavailable() =>
        new("Movie selections temporarily unavailable", ErrorCodes.ShowcaseUnavailable);

    public static ServiceUnavailableException SearchUnavailable() =>
        new("Movie search temporarily unavailable", ErrorCodes.SearchUnavailable);

    public static ServiceUnavailableException SuggestionUnavailable() =>
        new("The suggestion cannot be created right now, please retry in a moment", ErrorCodes.SuggestionUnavailable);

    private static Dictionary<string, object?> Params(params (string Key, object? Value)[] entries)
    {
        var dictionary = new Dictionary<string, object?>(entries.Length);
        foreach (var (key, value) in entries)
            dictionary[key] = value;
        return dictionary;
    }
}

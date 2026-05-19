export interface paths {
  '/api/v1/auth/register': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['RegisterRequest'];
          'text/json': components['schemas']['RegisterRequest'];
          'application/*+json': components['schemas']['RegisterRequest'];
        };
      };
      responses: {
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['RegisterResponse'];
            'application/json': components['schemas']['RegisterResponse'];
            'text/json': components['schemas']['RegisterResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/login': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['LoginRequest'];
          'text/json': components['schemas']['LoginRequest'];
          'application/*+json': components['schemas']['LoginRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['LoginResponse'];
            'application/json': components['schemas']['LoginResponse'];
            'text/json': components['schemas']['LoginResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/logout': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/me': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['UserProfileResponse'];
            'application/json': components['schemas']['UserProfileResponse'];
            'text/json': components['schemas']['UserProfileResponse'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['PatchUserProfileRequest'];
          'text/json': components['schemas']['PatchUserProfileRequest'];
          'application/*+json': components['schemas']['PatchUserProfileRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['UserProfileResponse'];
            'application/json': components['schemas']['UserProfileResponse'];
            'text/json': components['schemas']['UserProfileResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    trace?: never;
  };
  '/api/v1/auth/me/password': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['ChangePasswordRequest'];
          'text/json': components['schemas']['ChangePasswordRequest'];
          'application/*+json': components['schemas']['ChangePasswordRequest'];
        };
      };
      responses: {
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    trace?: never;
  };
  '/api/v1/auth/password-reset/request': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['PasswordResetRequest'];
          'text/json': components['schemas']['PasswordResetRequest'];
          'application/*+json': components['schemas']['PasswordResetRequest'];
        };
      };
      responses: {
        202: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/auth/password-reset/confirm': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['PasswordResetConfirmRequest'];
          'text/json': components['schemas']['PasswordResetConfirmRequest'];
          'application/*+json': components['schemas']['PasswordResetConfirmRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['PasswordResetConfirmResponse'];
            'application/json': components['schemas']['PasswordResetConfirmResponse'];
            'text/json': components['schemas']['PasswordResetConfirmResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/movies': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          participantId?: string;
        };
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['MovieWithScoreResponse'][];
            'application/json': components['schemas']['MovieWithScoreResponse'][];
            'text/json': components['schemas']['MovieWithScoreResponse'][];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['AddMovieRequest'];
          'text/json': components['schemas']['AddMovieRequest'];
          'application/*+json': components['schemas']['AddMovieRequest'];
        };
      };
      responses: {
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['MovieWithScoreResponse'];
            'application/json': components['schemas']['MovieWithScoreResponse'];
            'text/json': components['schemas']['MovieWithScoreResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/movies/{movieId}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
          movieId: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['DeleteMovieRequest'];
          'text/json': components['schemas']['DeleteMovieRequest'];
          'application/*+json': components['schemas']['DeleteMovieRequest'];
        };
      };
      responses: {
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/movies/{movieId}/vote': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
          movieId: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['VoteRequest'];
          'text/json': components['schemas']['VoteRequest'];
          'application/*+json': components['schemas']['VoteRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['VoteResponse'];
            'application/json': components['schemas']['VoteResponse'];
            'text/json': components['schemas']['VoteResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete: {
      parameters: {
        query?: {
          participantId?: string;
        };
        header?: never;
        path: {
          idOrSlug: string;
          movieId: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/movies/{movieId}/seen': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
          movieId: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['MarkAsSeenRequest'];
          'text/json': components['schemas']['MarkAsSeenRequest'];
          'application/*+json': components['schemas']['MarkAsSeenRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['SeenMarkResponse'];
            'application/json': components['schemas']['SeenMarkResponse'];
            'text/json': components['schemas']['SeenMarkResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
          movieId: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['UnmarkAsSeenRequest'];
          'text/json': components['schemas']['UnmarkAsSeenRequest'];
          'application/*+json': components['schemas']['UnmarkAsSeenRequest'];
        };
      };
      responses: {
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['CreateEventRequest'];
          'text/json': components['schemas']['CreateEventRequest'];
          'application/*+json': components['schemas']['CreateEventRequest'];
        };
      };
      responses: {
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['CreateEventResponse'];
            'application/json': components['schemas']['CreateEventResponse'];
            'text/json': components['schemas']['CreateEventResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/mine': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          limit?: number;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['MyEventsListResponse'];
            'application/json': components['schemas']['MyEventsListResponse'];
            'text/json': components['schemas']['MyEventsListResponse'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/config': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['EventConfigResponse'];
            'application/json': components['schemas']['EventConfigResponse'];
            'text/json': components['schemas']['EventConfigResponse'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['PatchEventConfigRequest'];
          'text/json': components['schemas']['PatchEventConfigRequest'];
          'application/*+json': components['schemas']['PatchEventConfigRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['EventConfigResponse'];
            'application/json': components['schemas']['EventConfigResponse'];
            'text/json': components['schemas']['EventConfigResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    trace?: never;
  };
  '/api/v1/events/slug/{idOrSlug}/share-preview': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/html': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/slug/{idOrSlug}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['EventDetailResponse'];
            'application/json': components['schemas']['EventDetailResponse'];
            'text/json': components['schemas']['EventDetailResponse'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/join': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['JoinEventRequest'];
          'text/json': components['schemas']['JoinEventRequest'];
          'application/*+json': components['schemas']['JoinEventRequest'];
        };
      };
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['JoinEventResult'];
            'application/json': components['schemas']['JoinEventResult'];
            'text/json': components['schemas']['JoinEventResult'];
          };
        };

        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['JoinEventResult'];
            'application/json': components['schemas']['JoinEventResult'];
            'text/json': components['schemas']['JoinEventResult'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/wheel': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['WheelResponse'];
            'application/json': components['schemas']['WheelResponse'];
            'text/json': components['schemas']['WheelResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/close': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['CloseEventResponse'];
            'application/json': components['schemas']['CloseEventResponse'];
            'text/json': components['schemas']['CloseEventResponse'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}/participants/{participantId}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
          participantId: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['RemoveParticipantResponse'];
            'application/json': components['schemas']['RemoveParticipantResponse'];
            'text/json': components['schemas']['RemoveParticipantResponse'];
          };
        };

        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/events/{idOrSlug}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          idOrSlug: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['DeleteEventResponse'];
            'application/json': components['schemas']['DeleteEventResponse'];
            'text/json': components['schemas']['DeleteEventResponse'];
          };
        };

        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['HealthOkResponse'];
            'application/json': components['schemas']['HealthOkResponse'];
            'text/json': components['schemas']['HealthOkResponse'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/movies/search': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          q?: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['MovieSearchListResponse'];
            'application/json': components['schemas']['MovieSearchListResponse'];
            'text/json': components['schemas']['MovieSearchListResponse'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        503: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/movies/tmdb/{tmdbId}/details': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          tmdbId: number;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['MovieDetailsResponse'];
            'application/json': components['schemas']['MovieDetailsResponse'];
            'text/json': components['schemas']['MovieDetailsResponse'];
          };
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'text/plain': components['schemas']['ProblemDetails'];
            'application/json': components['schemas']['ProblemDetails'];
            'text/json': components['schemas']['ProblemDetails'];
          };
        };

        500: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        503: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/posters/{posterKey}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          posterKey: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };

        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'image/jpeg': components['schemas']['ProblemDetails'];
            'image/png': components['schemas']['ProblemDetails'];
            'image/webp': components['schemas']['ProblemDetails'];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AccentColor: 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';
    AddMovieRequest: {
      tmdbId: number;
      title: string;
      year: string;
      posterPath?: string | null;
      participantId: string;
    };
    ChangePasswordRequest: {
      currentPassword: string;
      newPassword: string;
    };
    CloseEventResponse: {
      _id?: string | null;
      title?: string | null;
      date?: string | null;
      time?: string | null;
      slug?: string | null;
      config?: components['schemas']['EventConfigResponse'];

      closedAt?: string | null;
      winnerMovieId?: string | null;

      createdAt?: string;

      updatedAt?: string;
      message?: string | null;
    };
    CreateEventRequest: {
      title: string;
      date: string;
      time: string;
    };
    CreateEventResponse: {
      _id?: string | null;
      title?: string | null;
      date?: string | null;
      time?: string | null;
      slug?: string | null;
      shareUrl?: string | null;
      creatorParticipant?: components['schemas']['ParticipantResponse'];

      createdAt?: string;

      updatedAt?: string;
    };
    DeleteEventResponse: {
      eventId?: string | null;
      slug?: string | null;
      message?: string | null;

      removedParticipants?: number;

      removedMovies?: number;

      removedVotes?: number;

      removedSeenMarks?: number;
    };
    DeleteMovieRequest: {
      participantId: string;
    };
    EventConfigResponse: {
      theme?: string | null;

      endDate?: string | null;

      maxProposalsPerParticipant?: number | null;

      maxParticipants?: number | null;
      wheelMode?: components['schemas']['WheelMode'];
      richSharePreview?: boolean;
    };
    EventDetailResponse: {
      _id?: string | null;
      title?: string | null;
      date?: string | null;
      time?: string | null;
      slug?: string | null;
      config: components['schemas']['EventConfigResponse'];

      closedAt?: string | null;
      winnerMovieId?: string | null;

      createdAt?: string;

      updatedAt?: string;
      isHost?: boolean;
      isFinished?: boolean;
      winnerMovie?: components['schemas']['WinnerMovieResponse'];
      myParticipant?: components['schemas']['ParticipantResponse'];

      participantCount?: number;

      movieCount?: number;
      participants?: components['schemas']['EventParticipantSummaryResponse'][] | null;
    };
    EventParticipantSummaryResponse: {
      _id?: string | null;
      pseudo?: string | null;
      isCreator?: boolean;
    };
    HealthOkResponse: {
      status?: string | null;
      service?: string | null;
    };
    JoinEventRequest: {
      pseudo: string;
    };
    JoinEventResult: {
      participant?: components['schemas']['ParticipantResponse'];
      isNew?: boolean;
      message?: string | null;
    };
    LoginRequest: {
      email: string;
      password: string;
    };
    LoginResponse: {
      userId?: string | null;
      displayName?: string | null;
    };
    MarkAsSeenRequest: {
      participantId: string;
    };
    MovieDetailsResponse: {
      tmdbId?: number;
      title?: string | null;
      overview?: string | null;
      tagline?: string | null;
      director?: string | null;
      cast?: string[] | null;

      runtimeMinutes?: number | null;
      genres?: string[] | null;
      releaseDate?: string | null;
    };
    MovieSearchItemResponse: {
      id?: number;
      title?: string | null;
      year?: string | null;
      posterPath?: string | null;

      voteAverage?: number | null;

      runtimeMinutes?: number | null;
      watchProviders?: components['schemas']['WatchProviderOfferResponse'][] | null;
      tmdbWatchPageUrl?: string | null;
    };
    MovieSearchListResponse: {
      items?: components['schemas']['MovieSearchItemResponse'][] | null;
      watchProvidersRegion?: string | null;
      disclaimer?: string | null;
      tmdbAttributionUrl?: string | null;
    };
    MovieWithScoreResponse: {
      _id?: string | null;
      eventId?: string | null;
      participantId?: string | null;

      tmdbId?: number;
      title?: string | null;
      year?: string | null;
      posterPath?: string | null;

      createdAt?: string;

      updatedAt?: string;
      proposerPseudo?: string | null;

      score?: number;

      up?: number;

      down?: number;

      myVote?: number | null;

      seenCount?: number;
      seenByPseudos?: string[] | null;

      voteAverage?: number | null;
      watchProviders?: components['schemas']['WatchProviderOfferResponse'][] | null;
      tmdbWatchPageUrl?: string | null;

      runtimeMinutes?: number | null;
    };
    MyEventSummaryDto: {
      id?: string | null;
      slug?: string | null;
      title?: string | null;
      date?: string | null;
      time?: string | null;

      createdAt?: string;

      updatedAt?: string;
      isCreator?: boolean;
      isParticipant?: boolean;
      lifecycle?: string | null;

      participantCount?: number;

      movieCount?: number;

      maxParticipants?: number | null;
      theme?: string | null;
    };
    MyEventsListResponse: {
      events?: components['schemas']['MyEventSummaryDto'][] | null;
    };
    ParticipantResponse: {
      _id?: string | null;
      eventId?: string | null;
      pseudo?: string | null;

      createdAt?: string;

      updatedAt?: string;
    };
    PasswordResetConfirmRequest: {
      token?: string | null;
      newPassword?: string | null;
    };
    PasswordResetConfirmResponse: {
      message?: string | null;
    };
    PasswordResetRequest: {
      email?: string | null;
      locale?: string | null;
    };
    PatchEventConfigRequest: {
      theme?: string | null;
      endDate?: string | null;

      maxProposalsPerParticipant?: number | null;

      maxParticipants?: number | null;
      wheelMode?: components['schemas']['WheelMode'];
      richSharePreview?: boolean | null;
    };
    PatchUserProfileRequest: {
      displayName?: string | null;
      uiTheme?: string | null;
      accentColor?: string | null;
    };
    ProblemDetails: {
      type?: string | null;
      title?: string | null;

      status?: number | null;
      detail?: string | null;
      instance?: string | null;
    } & {
      [key: string]: unknown;
    };
    RegisterRequest: {
      email: string;
      password: string;
      displayName: string;
    };
    RegisterResponse: {
      userId?: string | null;
      displayName?: string | null;
    };
    RemoveParticipantResponse: {
      participantId?: string | null;
      eventId?: string | null;
      message?: string | null;

      removedMovies?: number;
    };
    SeenMarkResponse: {
      _id?: string | null;
      eventId?: string | null;
      movieId?: string | null;
      participantId?: string | null;

      createdAt?: string;

      updatedAt?: string;
    };

    UiThemePreference: 'system' | 'light' | 'dark';
    UnmarkAsSeenRequest: {
      participantId: string;
    };
    UserProfileResponse: {
      userId?: string | null;
      displayName?: string | null;
      emailMasked?: string | null;
      uiTheme?: components['schemas']['UiThemePreference'];
      accentColor?: components['schemas']['AccentColor'];
    };
    VoteRequest: {
      participantId: string;

      value: number;
    };
    VoteResponse: {
      _id?: string | null;
      eventId?: string | null;
      movieId?: string | null;
      participantId?: string | null;

      value?: number;

      createdAt?: string;

      updatedAt?: string;
    };
    WatchProviderOfferResponse: {
      providerId?: number;
      name?: string | null;
      logoPath?: string | null;
      type?: string | null;
    };

    WheelMode: 'strictRandom' | 'weightedByVotes';
    WheelResponse: {
      winner?: components['schemas']['WinnerMovieResponse'];
      message?: string | null;
    };
    WinnerMovieResponse: {
      _id?: string | null;
      eventId?: string | null;
      participantId?: string | null;

      tmdbId?: number;
      title?: string | null;
      year?: string | null;
      posterPath?: string | null;

      createdAt?: string;

      updatedAt?: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

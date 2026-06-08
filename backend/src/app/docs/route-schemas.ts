const uuid = { type: "string", format: "uuid" } as const;
const idString = { type: "string" } as const;
const dateTime = { type: "string", format: "date-time" } as const;

const errorResponse = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object", additionalProperties: true }
      }
    }
  }
} as const;

const user = {
  type: "object",
  required: ["id", "email", "displayName", "avatarUrl", "createdAt"],
  properties: {
    id: idString,
    email: { type: "string", format: "email" },
    displayName: { type: "string" },
    avatarUrl: { type: ["string", "null"], format: "uri" },
    createdAt: dateTime
  }
} as const;

const tokenPair = {
  type: "object",
  required: ["user", "accessToken", "refreshToken", "expiresAt"],
  properties: {
    user,
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    expiresAt: dateTime
  }
} as const;

const mangaSummary = {
  type: "object",
  required: ["id", "title", "altTitles", "description", "tags"],
  properties: {
    id: uuid,
    title: { type: "string" },
    altTitles: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    status: { type: "string" },
    year: { type: "integer" },
    contentRating: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    coverUrl: { type: "string" }
  }
} as const;

const chapterSummary = {
  type: "object",
  required: ["id", "title", "chapter", "volume", "translatedLanguage", "publishAt", "pages"],
  properties: {
    id: uuid,
    title: { type: "string" },
    chapter: { type: ["string", "null"] },
    volume: { type: ["string", "null"] },
    translatedLanguage: { type: "string" },
    publishAt: { type: "string" },
    pages: { type: "integer" },
    scanlationGroup: { type: "string" }
  }
} as const;

const readingProgress = {
  type: "object",
  required: ["id", "userId", "mangaId", "chapterId", "pageIndex", "completed", "createdAt", "updatedAt"],
  properties: {
    id: idString,
    userId: idString,
    mangaId: uuid,
    chapterId: uuid,
    pageIndex: { type: "integer", minimum: 0 },
    completed: { type: "boolean" },
    createdAt: dateTime,
    updatedAt: dateTime
  }
} as const;

const libraryItem = {
  type: "object",
  required: ["id", "userId", "mangaId", "status", "isFavorite", "lastChapterId", "lastReadAt", "createdAt", "updatedAt"],
  properties: {
    id: idString,
    userId: idString,
    mangaId: uuid,
    status: { type: "string", enum: ["READING", "PLAN_TO_READ", "COMPLETED", "PAUSED", "DROPPED"] },
    isFavorite: { type: "boolean" },
    lastChapterId: { type: ["string", "null"], format: "uuid" },
    lastReadAt: { type: ["string", "null"], format: "date-time" },
    createdAt: dateTime,
    updatedAt: dateTime,
    manga: {
      anyOf: [
        {
          type: "object",
          properties: {
            id: uuid,
            title: { type: "string" },
            coverUrl: { type: ["string", "null"] },
            status: { type: ["string", "null"] },
            year: { type: ["integer", "null"] },
            tags: { type: "array", items: { type: "string" } }
          }
        },
        { type: "null" }
      ]
    },
    readingProgress: { anyOf: [readingProgress, { type: "null" }] }
  }
} as const;

const pagination = <TItem extends object>(item: TItem) =>
  ({
    type: "object",
    required: ["data", "limit", "offset", "total"],
    properties: {
      data: { type: "array", items: item },
      limit: { type: "integer" },
      offset: { type: "integer" },
      total: { type: "integer" },
      source: { type: "string", enum: ["live", "cache"] }
    }
  }) as const;

const chapterPagination = {
  type: "object",
  required: ["data", "limit", "offset", "total", "source", "needsSync"],
  properties: {
    data: { type: "array", items: chapterSummary },
    limit: { type: "integer" },
    offset: { type: "integer" },
    total: { type: "integer" },
    source: { type: "string", enum: ["db"] },
    needsSync: { type: "boolean" }
  }
} as const;

const importSummary = {
  type: "object",
  required: ["mangaId", "mangaSaved", "chaptersFetched", "readableChaptersSaved", "zeroPageChaptersSkipped", "source"],
  properties: {
    mangaId: { type: "string" },
    mangaSaved: { type: "boolean" },
    chaptersFetched: { type: "integer" },
    readableChaptersSaved: { type: "integer" },
    zeroPageChaptersSkipped: { type: "integer" },
    source: { type: "string", enum: ["mangadex"] }
  }
} as const;

const importResponse = {
  type: "object",
  required: ["status", "summary"],
  properties: {
    status: { type: "string", enum: ["completed"] },
    summary: importSummary
  }
} as const;

const syncResponse = {
  type: "object",
  required: ["status", "summary"],
  properties: {
    status: { type: "string", enum: ["completed"] },
    summary: {
      type: "object",
      required: ["mangaCount", "cachedTotal"],
      properties: {
        mangaCount: { type: "integer" },
        cachedTotal: { type: "integer" }
      }
    }
  }
} as const;

const secured = [{ bearerAuth: [] }];
const errors = { 400: errorResponse, 401: errorResponse, 404: errorResponse, 409: errorResponse, 500: errorResponse } as const;
const adminErrors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse, 503: errorResponse } as const;

export const healthRouteSchemas = {
  liveness: {
    summary: "Check service liveness",
    tags: ["Health"],
    response: {
      200: {
        type: "object",
        required: ["ok"],
        properties: { ok: { type: "boolean" } }
      }
    }
  },
  readiness: {
    summary: "Check dependency readiness",
    tags: ["Health"],
    response: {
      200: {
        type: "object",
        required: ["ok", "checks"],
        properties: {
          ok: { type: "boolean" },
          checks: {
            type: "object",
            required: ["postgres", "redis"],
            properties: {
              postgres: { type: "string", enum: ["ok", "error"] },
              redis: { type: "string", enum: ["ok", "error"] }
            }
          }
        }
      },
      503: {
        type: "object",
        required: ["ok", "checks"],
        properties: {
          ok: { type: "boolean" },
          checks: { type: "object", additionalProperties: { type: "string" } }
        }
      }
    }
  }
} as const;

export const authRouteSchemas = {
  register: {
    summary: "Register a new account",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password", "displayName"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8, maxLength: 128 },
        displayName: { type: "string", minLength: 2, maxLength: 40 }
      }
    },
    response: { 201: tokenPair, ...errors }
  },
  login: {
    summary: "Login with email and password",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" }
      }
    },
    response: { 200: tokenPair, ...errors }
  },
  refresh: {
    summary: "Rotate refresh token",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["refreshToken"],
      properties: { refreshToken: { type: "string", minLength: 20 } }
    },
    response: { 200: tokenPair, ...errors }
  },
  logout: {
    summary: "Revoke a refresh token",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["refreshToken"],
      properties: { refreshToken: { type: "string", minLength: 20 } }
    },
    response: { 200: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } }, ...errors }
  },
  me: {
    summary: "Get the authenticated user",
    tags: ["Auth"],
    security: secured,
    response: { 200: { type: "object", required: ["user"], properties: { user } }, ...errors }
  },
  updateMe: {
    summary: "Update the authenticated user's profile",
    tags: ["Auth"],
    security: secured,
    body: {
      type: "object",
      properties: {
        displayName: { type: "string", minLength: 2, maxLength: 40 },
        avatarUrl: { type: ["string", "null"], format: "uri" }
      }
    },
    response: { 200: { type: "object", required: ["user"], properties: { user } }, ...errors }
  },
  changePassword: {
    summary: "Change password and issue fresh tokens",
    tags: ["Auth"],
    security: secured,
    body: {
      type: "object",
      required: ["currentPassword", "newPassword"],
      properties: {
        currentPassword: { type: "string" },
        newPassword: { type: "string", minLength: 8, maxLength: 128 }
      }
    },
    response: { 200: tokenPair, ...errors }
  }
} as const;

export const catalogRouteSchemas = {
  search: {
    summary: "Search MangaDex manga",
    tags: ["Catalog"],
    querystring: {
      type: "object",
      properties: {
        q: { type: "string", maxLength: 120 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 24 },
        offset: { type: "integer", minimum: 0, default: 0 },
        languages: { type: "string", default: "vi,en" },
        tags: { type: "string" },
        includedTags: { type: "string" },
        excludedTags: { type: "string" },
        contentRating: { type: "string", default: "safe,suggestive" },
        status: { type: "string" },
        year: { type: "integer", minimum: 1900 },
        demographic: { type: "string" },
        sort: { type: "string", enum: ["relevance", "latest", "followed", "title", "created", "updated"], default: "relevance" },
        genre: { type: "string" },
        genres: { type: "string" }
      }
    },
    response: { 200: pagination(mangaSummary), ...errors }
  },
  genres: {
    summary: "List cached manga genres",
    tags: ["Catalog"],
    response: {
      200: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "count"],
              properties: { name: { type: "string" }, count: { type: "integer" } }
            }
          }
        }
      },
      ...errors
    }
  },
  mangaDetail: {
    summary: "Get manga details",
    tags: ["Catalog"],
    params: { type: "object", required: ["id"], properties: { id: uuid } },
    response: { 200: mangaSummary, ...errors }
  },
  chapters: {
    summary: "List manga chapters",
    tags: ["Catalog"],
    params: { type: "object", required: ["id"], properties: { id: uuid } },
    querystring: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100, default: 96 },
        offset: { type: "integer", minimum: 0, default: 0 },
        translatedLanguage: { type: "string", default: "vi,en" }
      }
    },
    response: { 200: chapterPagination, 202: chapterPagination, ...errors }
  },
  reader: {
    summary: "Get chapter reader metadata",
    tags: ["Catalog"],
    params: { type: "object", required: ["id"], properties: { id: uuid } },
    response: {
      200: {
        type: "object",
        required: ["baseUrl", "hash", "pages", "dataSaverPages", "pageUrls", "dataSaverPageUrls"],
        properties: {
          baseUrl: { type: "string" },
          hash: { type: "string" },
          pages: { type: "array", items: { type: "string" } },
          dataSaverPages: { type: "array", items: { type: "string" } },
          pageUrls: { type: "array", items: { type: "string" } },
          dataSaverPageUrls: { type: "array", items: { type: "string" } }
        }
      },
      ...errors
    }
  }
} as const;

export const adminCatalogRouteSchemas = {
  importManga: {
    summary: "Import one MangaDex manga into the local catalog cache",
    tags: ["Admin Catalog"],
    params: { type: "object", required: ["id"], properties: { id: uuid } },
    querystring: {
      type: "object",
      properties: {
        includeChapters: { type: "string", enum: ["true", "false"], default: "false" },
        languages: { type: "string", default: "vi,en" },
        chaptersLimit: { type: "integer", minimum: 1, maximum: 100, default: 100 }
      }
    },
    response: { 200: importResponse, ...adminErrors }
  },
  importMangaChapters: {
    summary: "Import one MangaDex manga chapter feed into the local catalog cache",
    tags: ["Admin Catalog"],
    params: { type: "object", required: ["id"], properties: { id: uuid } },
    querystring: {
      type: "object",
      properties: {
        languages: { type: "string", default: "vi,en" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 100 },
        offset: { type: "integer", minimum: 0, default: 0 }
      }
    },
    response: { 200: importResponse, ...adminErrors }
  },
  syncCatalog: {
    summary: "Run a MangaDex catalog sync",
    tags: ["Admin Catalog"],
    querystring: {
      type: "object",
      properties: {
        q: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        languages: { type: "string", default: "vi,en" },
        includeChapters: { type: "string", enum: ["true", "false"], default: "false" },
        chaptersLimit: { type: "integer", minimum: 1, maximum: 100, default: 32 }
      }
    },
    response: { 200: syncResponse, ...adminErrors }
  }
} as const;

export const mediaRouteSchemas = {
  cover: {
    summary: "Proxy a MangaDex cover image",
    description:
      "Streams cover image bytes from MangaDex with public cache headers. Forwards ETag and Last-Modified when available and supports 304 passthrough for conditional requests.",
    tags: ["Media"],
    params: {
      type: "object",
      required: ["mangaId", "fileName"],
      properties: { mangaId: uuid, fileName: { type: "string" } }
    },
    response: { 200: { type: "string", format: "binary" }, 304: { description: "Image was not modified" }, ...errors }
  },
  page: {
    summary: "Proxy a MangaDex chapter page image",
    description:
      "Streams chapter page image bytes for data or data-saver reader modes. Forwards cache validators and uses public cache headers suitable for CDN edge caching.",
    tags: ["Media"],
    params: {
      type: "object",
      required: ["chapterId", "mode", "fileName"],
      properties: {
        chapterId: uuid,
        mode: { type: "string", enum: ["data", "data-saver"] },
        fileName: { type: "string" }
      }
    },
    response: { 200: { type: "string", format: "binary" }, 304: { description: "Image was not modified" }, ...errors }
  }
} as const;

export const libraryRouteSchemas = {
  list: {
    summary: "List authenticated user's library",
    tags: ["Library"],
    security: secured,
    response: {
      200: { type: "object", required: ["data"], properties: { data: { type: "array", items: libraryItem } } },
      ...errors
    }
  },
  item: {
    summary: "Get one library item",
    tags: ["Library"],
    security: secured,
    params: { type: "object", required: ["mangaId"], properties: { mangaId: uuid } },
    response: { 200: { type: "object", required: ["item"], properties: { item: { anyOf: [libraryItem, { type: "null" }] } } }, ...errors }
  },
  upsert: {
    summary: "Add or update a library item",
    tags: ["Library"],
    security: secured,
    params: { type: "object", required: ["mangaId"], properties: { mangaId: uuid } },
    body: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["READING", "PLAN_TO_READ", "COMPLETED", "PAUSED", "DROPPED"], default: "READING" },
        isFavorite: { type: "boolean", default: false },
        lastChapterId: uuid
      }
    },
    response: { 200: { type: "object", required: ["item"], properties: { item: libraryItem } }, ...errors }
  },
  remove: {
    summary: "Remove a manga from the authenticated user's library",
    tags: ["Library"],
    security: secured,
    params: { type: "object", required: ["mangaId"], properties: { mangaId: uuid } },
    response: { 200: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } }, ...errors }
  }
} as const;

export const progressRouteSchemas = {
  manga: {
    summary: "Get latest and chapter-level manga progress",
    tags: ["Progress"],
    security: secured,
    params: { type: "object", required: ["mangaId"], properties: { mangaId: uuid } },
    response: {
      200: {
        type: "object",
        required: ["progress", "chaptersProgress"],
        properties: {
          progress: { anyOf: [readingProgress, { type: "null" }] },
          chaptersProgress: { type: "array", items: readingProgress },
          chapter: { anyOf: [chapterSummary, { type: "null" }] }
        }
      },
      ...errors
    }
  },
  chapter: {
    summary: "Get progress for a chapter",
    tags: ["Progress"],
    security: secured,
    params: { type: "object", required: ["chapterId"], properties: { chapterId: uuid } },
    response: { 200: { type: "object", required: ["progress"], properties: { progress: { anyOf: [readingProgress, { type: "null" }] } } }, ...errors }
  },
  save: {
    summary: "Save progress for a chapter",
    tags: ["Progress"],
    security: secured,
    params: { type: "object", required: ["chapterId"], properties: { chapterId: uuid } },
    body: {
      type: "object",
      required: ["mangaId", "pageIndex", "completed"],
      properties: {
        mangaId: uuid,
        pageIndex: { type: "integer", minimum: 0 },
        completed: { type: "boolean", default: false }
      }
    },
    response: { 200: { type: "object", required: ["progress"], properties: { progress: readingProgress } }, ...errors }
  }
} as const;

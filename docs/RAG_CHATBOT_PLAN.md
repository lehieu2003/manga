# RAG Chatbot MVP Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the RAG chatbot MVP without needing the original conversation.

## Summary

The RAG chatbot adds an authenticated floating assistant to the manga reader. It helps users discover manga, ask questions about the catalog, and continue reading from their own library/progress context.

The MVP uses PostgreSQL with pgvector as the vector store. The backend owns the full RAG workflow: build documents from cached manga metadata, embed them, retrieve relevant context, enrich it with user data, and generate a grounded answer through OpenAI models. The frontend adds a floating chat widget available across protected app sessions.

The chatbot should not inspect manga page images or OCR chapter content in the MVP. The first retrieval corpus is metadata already available in the local catalog cache: manga titles, alternative titles, descriptions, tags, authors, artists, status, year, content rating, and chapter metadata.

## Status Legend

- `Done`: the decision or implementation step is complete.
- `In Progress`: active work has started.
- `Not Started`: planned but no implementation work has started.
- `Blocked`: cannot move forward without a dependency or decision.

## Current Status

| Step | Area | Status | Notes |
| --- | --- | --- | --- |
| 0 | Product decisions | Done | Auth-only floating widget, standard RAG workflow, PostgreSQL + pgvector. |
| 1 | Database and configuration | In Progress | Prisma schema, migration, compose image, and env config added. Local migration still needs to be applied against a running pgvector database. |
| 2 | Catalog document builder | Done | Manga and chapter metadata builders added with unit coverage. |
| 3 | Embedding indexing pipeline | In Progress | Manual index command added. Automatic sync hook and live indexing run remain. |
| 4 | Retrieval service | Done | Query embedding, pgvector search, score threshold, and metadata filters added. |
| 5 | Chat orchestration service | In Progress | Authenticated chat flow, intent extraction, retrieval, personalization context, and answer generation added. More evaluation/tuning remains. |
| 6 | Chat API contract | Done | Authenticated message, conversation list, message list, and archive endpoints added. |
| 7 | Floating frontend widget | Done | Auth-only floating widget, optimistic messages, retry, starter prompts, and source links added. |
| 8 | Observability and guardrails | In Progress | Auth, ownership checks, length validation, weak-context fallback, and latency/token persistence added. Structured production logging still needs tuning. |
| 9 | Tests and verification | In Progress | Focused backend/frontend tests added and full workspace verification passed. Browser smoke test remains. |
| 10 | Later MVP expansions | Not Started | Add deeper personalization and reader-assistant actions after MVP 1. |

## Goals

- Let logged-in users ask natural-language questions about available manga.
- Recommend manga based on retrieved catalog context and, where useful, the user's library/progress/search history.
- Return useful source links so users can open manga detail pages or resume chapters.
- Keep answers grounded in retrieved data instead of inventing unavailable manga facts.
- Use a real semantic retrieval workflow with embeddings and pgvector, not keyword-only SQL search.
- Make the feature deployable with the existing PostgreSQL-backed architecture.

## Non-Goals

- No OCR or image understanding of manga pages.
- No full chapter-content summarization unless text content is later stored legally and explicitly.
- No anonymous chat in the MVP.
- No voice chat.
- No external vector database service for MVP.
- No autonomous actions such as modifying the library without explicit future confirmation flows.

## Product Scope

### MVP 1: Catalog RAG

The assistant answers catalog and discovery questions, such as:

- "Recommend completed action manga."
- "Find romance manga with school-life vibes."
- "What is this manga about?"
- "Suggest something similar to dark fantasy but not horror."

This phase uses catalog metadata and chapter metadata. It may reference user history only as lightweight context if it is already easy to fetch.

### MVP 2: Personalization

The assistant uses user-specific context:

- library status
- favorites
- last read manga and chapters
- reading progress
- recent searches

Example questions:

- "What should I continue reading?"
- "Recommend something based on my favorites."
- "Which manga did I stop reading recently?"

### MVP 3: Reader Assistant

The assistant becomes context-aware inside detail and reader flows:

- "Open the next chapter."
- "Where did I stop?"
- "Show chapters I have not finished."
- "Explain this manga's metadata and tags."

This phase can add structured actions, but the MVP should keep actions read-only until confirmation UX exists.

## Architecture

The backend owns five separate responsibilities:

1. **Document building**: convert catalog rows into normalized RAG documents.
2. **Embedding indexing**: call OpenAI embeddings and store vectors in PostgreSQL through pgvector.
3. **Retrieval**: embed the user's query and search the vector index for relevant context.
4. **Chat orchestration**: combine intent, retrieved documents, user context, and prompt instructions.
5. **API delivery**: expose authenticated chat endpoints to the frontend.

The frontend owns:

1. **Global entry point**: floating chat button rendered in the authenticated app shell.
2. **Conversation UI**: compact panel with messages, loading states, retry, and source links.
3. **Client state**: current conversation, optimistic user message, and error recovery.
4. **Navigation affordances**: links from assistant sources to manga detail or reader pages.

## Data Model Plan

### pgvector Extension

Enable pgvector in PostgreSQL. The production and local database setup must both support the extension before migrations depending on vector columns are deployed.

### RAG Documents

Add a RAG document table for indexed content.

Required fields:

- `id`: stable internal identifier
- `sourceType`: `manga`, `chapter`, or future source type
- `sourceId`: catalog manga or chapter identifier
- `parentSourceId`: manga identifier for chapter documents
- `title`: human-readable document title
- `content`: normalized text sent to the embedding model
- `metadata`: JSON for tags, language, year, status, content rating, author, artist, chapter number
- `contentHash`: hash of source fields used for reindex detection
- `embedding`: pgvector column
- `embeddingModel`: model used to generate the vector
- `indexedAt`: last successful embedding time
- `createdAt` and `updatedAt`

Constraints:

- Unique source identity: `sourceType` plus `sourceId`.
- Index source fields needed for incremental reindexing.
- Add vector index after enough data exists or during migration if the local dataset is small.

### Chat Conversations

Add chat persistence so the widget can recover recent context and support future evaluation.

Required fields:

- conversation owner
- title or generated short label
- timestamps
- archived flag, optional

### Chat Messages

Persist user and assistant messages.

Required fields:

- conversation id
- role: `user`, `assistant`, `system`, or `tool`
- content
- sources JSON
- model
- token usage JSON, when available
- latency metadata, when available
- created timestamp

## OpenAI Configuration

Required environment values:

```env
OPENAI_API_KEY=
GPT_MODEL_NANO=gpt-4.1-nano
GPT_MODEL_MINI=gpt-4.1-mini
GPT_EMBEDDING_MODEL=text-embedding-3-small
```

Model responsibilities:

- `GPT_MODEL_NANO`: low-cost intent classification, query rewriting, and filter extraction.
- `GPT_MODEL_MINI`: final user-facing answer generation.
- `GPT_EMBEDDING_MODEL`: document and query embeddings.

The OpenAI embeddings guide describes embeddings as useful for search and recommendations. The OpenAI retrieval guide describes semantic retrieval around vector stores, chunking, embeddings, ranking, and score thresholds. Those match the intended workflow for this feature.

References:

- https://developers.openai.com/api/docs/guides/embeddings
- https://developers.openai.com/api/docs/guides/retrieval

## RAG Document Format

Each indexed manga document should be deterministic and compact.

Example shape:

```text
Type: Manga
Title: <primary title>
Alternative titles: <alt titles>
Description: <description>
Tags: <tags>
Authors: <authors>
Artists: <artists>
Status: <status>
Year: <year>
Content rating: <content rating>
Available languages: <chapter languages>
Readable chapters: <count>
```

Each chapter document should stay metadata-focused.

```text
Type: Chapter
Manga: <manga title>
Chapter: <chapter number and title>
Volume: <volume>
Language: <translated language>
Published: <date>
Pages: <page count>
Scanlation group: <group>
```

Chunking rule for MVP:

- One manga document per manga.
- One chapter metadata document per chapter only if chapter-level retrieval is needed.
- If a description is unusually long, split manga documents into overview and description chunks.

## Indexing Pipeline

### Step 1: Build Source Documents

Read cached catalog rows and construct deterministic document content. Include only fields that are useful to answer user questions.

Acceptance checks:

- Documents are stable for the same source data.
- Missing optional metadata does not create broken text.
- Documents include enough fields to answer discovery questions.

### Step 2: Detect Changed Documents

Compute `contentHash` for each document. Reindex only if the source does not exist yet, the hash changed, or the embedding model changed.

Acceptance checks:

- Re-running the indexer does not duplicate documents.
- Unchanged documents are skipped.
- Changed metadata updates the document and embedding.

### Step 3: Generate Embeddings

Batch embedding requests where safe. Store the embedding vector and model name with the document.

Acceptance checks:

- Failed embedding requests do not corrupt existing embeddings.
- Partial failures can be retried.
- Indexing logs include counts for created, updated, skipped, and failed documents.

### Step 4: Trigger Indexing

Provide two ways to index:

- manual script for backfill and local development
- service hook after catalog import/sync updates

Acceptance checks:

- A fresh database can be indexed after seeding/syncing catalog data.
- Existing catalog sync can continue working if embedding is temporarily unavailable.

## Retrieval Flow

### Input

The chat service receives:

- authenticated user id
- user message
- optional conversation id
- optional current route context, such as manga id or chapter id

### Intent and Filter Extraction

Use the nano model to produce structured intent data:

- intent: recommendation, catalog question, continue reading, reader help, unknown
- query rewrite for retrieval
- filters: genre, status, year, language, content rating, manga id, chapter id
- personalization need: none, light, required

This step should be optional in failure cases. If classification fails, use the raw message as the retrieval query.

### Vector Search

Embed the rewritten query and search pgvector for top matches.

Recommended MVP defaults:

- top-K before filtering: 20
- final context documents: 6 to 10
- score threshold: conservative enough to avoid weak answers
- prefer manga documents over chapter documents unless the user asks chapter-specific questions

### Hybrid Filtering

Apply metadata filters when the user asks for explicit constraints:

- included tags
- status
- year
- language
- content rating
- manga id or current route

Use vector similarity for meaning and metadata filters for hard constraints.

### Personalization Context

For auth-only MVP, fetch a compact user context block:

- active library items
- favorites
- recent progress
- recent searches

Keep this block small. It should guide recommendations, not dominate the retrieved catalog context.

### Context Assembly

Construct a prompt context with:

- retrieved documents, each with source id and relevance score
- user context summary
- current route context, if available
- allowed answer behavior
- refusal/uncertainty rule

The final prompt must instruct the model to answer only from retrieved context and user context.

## Answer Generation

Use the mini model for assistant responses.

Response requirements:

- concise natural-language answer
- 3 to 6 recommendations when recommending manga
- short reason for each recommendation
- source list with manga or chapter ids
- clear fallback when the catalog has insufficient data
- no claim about chapter page content unless that text exists in the indexed corpus

Structured response shape:

```json
{
  "message": "Assistant response text",
  "sources": [
    {
      "type": "manga",
      "id": "source-id",
      "title": "Source title",
      "reason": "Why it was used"
    }
  ],
  "suggestedActions": [
    {
      "type": "open_manga",
      "label": "Open manga",
      "targetId": "manga-id"
    }
  ]
}
```

## API Plan

### Create or Continue Chat

`POST /api/v1/chat/messages`

Authentication: required.

Request:

```json
{
  "conversationId": "optional-conversation-id",
  "message": "Recommend completed action manga",
  "routeContext": {
    "mangaId": "optional-current-manga-id",
    "chapterId": "optional-current-chapter-id"
  }
}
```

Response:

```json
{
  "conversationId": "conversation-id",
  "message": {
    "id": "assistant-message-id",
    "role": "assistant",
    "content": "response text",
    "sources": [],
    "suggestedActions": [],
    "createdAt": "timestamp"
  }
}
```

### List Conversations

`GET /api/v1/chat/conversations`

Authentication: required.

Returns recent conversations for the current user.

### Get Conversation Messages

`GET /api/v1/chat/conversations/:id/messages`

Authentication: required.

Returns messages only if the conversation belongs to the current user.

### Delete or Archive Conversation

`DELETE /api/v1/chat/conversations/:id`

Authentication: required.

Soft-delete or archive is preferred so evaluation data can remain available without showing old conversations.

## Frontend Plan

### Widget Placement

Render a floating chat button in the app shell when the user is authenticated.

Default states:

- closed: compact button at the bottom corner
- open: fixed chat panel above the button area
- loading: input disabled and assistant typing indicator visible
- error: failed message shows retry action

### Panel Layout

The panel should include:

- compact header with title and close button
- scrollable message list
- source cards or inline source links for assistant messages
- input row with send button
- empty state with a few starter prompts

Starter prompts:

- "Recommend something completed."
- "What should I continue reading?"
- "Find romance manga with school-life tags."
- "Suggest something based on my library."

### Message Behavior

- User message appears optimistically.
- Assistant response replaces loading state when the backend returns.
- Errors preserve the user's message and offer retry.
- Source clicks navigate to manga detail or reader routes.
- The panel should keep local state while the user navigates between pages.

### Access Rules

- Anonymous users do not see the chat widget.
- If an auth token expires, existing auth refresh behavior should run before the chat request fails.
- If the user logs out, clear local chat UI state.

## Guardrails

- Require authentication for every chat endpoint.
- Scope every conversation query by user id.
- Clamp message length.
- Rate-limit chat endpoints separately from normal catalog endpoints.
- Never include raw access tokens, refresh tokens, password hashes, or admin secrets in prompts.
- Keep user context summarized and minimal.
- If retrieved context is weak, answer with uncertainty and suggest a normal search.
- Do not claim to know manga page content or plot details beyond available metadata.
- Log model failures without logging sensitive prompt content in production.

## Observability

Track:

- request latency
- embedding latency
- retrieval latency
- generation latency
- selected intent
- number of retrieved documents
- retrieval score range
- model names
- token usage when available
- failure type

Useful counters:

- chat requests
- retrieval empty results
- generation failures
- embedding failures
- index documents created/updated/skipped/failed

These signals should make debugging possible without replaying private user messages.

## Testing Plan

### Backend Unit Tests

- Document builder creates stable content.
- Content hash changes when source metadata changes.
- Retrieval service applies metadata filters.
- Prompt assembly excludes sensitive user fields.
- Guardrail fallback triggers when no retrieved context passes threshold.

### Backend Integration Tests

- Authenticated chat creates a conversation and assistant message.
- Anonymous chat requests are rejected.
- User cannot read another user's conversation.
- Indexer can embed and store a test document with the OpenAI client mocked.
- Retrieval returns expected documents for seeded vectors or mocked vector search.

### Frontend Tests

- Widget is hidden for anonymous users.
- Widget appears for authenticated users.
- Sending a message renders optimistic user text and loading state.
- Successful response renders assistant text and source links.
- Failed response shows retry.
- Logout clears local widget state.

### Verification Commands

Use the existing workspace checks:

```bash
npm run test --workspaces
npm run typecheck --workspaces
npm run build --workspaces
```

## Step-by-Step Implementation Plan

### Step 1: Database and Configuration

Status: `In Progress`

Tasks:

- Add pgvector support to local and production PostgreSQL setup.
- Add migration for RAG documents, chat conversations, and chat messages.
- Add OpenAI model configuration fields.
- Add startup validation for required chat configuration when chat is enabled.

Exit criteria:

- Database migration applies locally.
- Backend can start with chat disabled if OpenAI config is absent.
- Backend validates required OpenAI config when chat is enabled.

### Step 2: Document Builder

Status: `Done`

Tasks:

- Create deterministic document text for cached manga.
- Create deterministic document text for chapter metadata if included in MVP 1.
- Add content hash generation.
- Add tests for missing optional metadata.

Exit criteria:

- Same source row produces same document and hash.
- Changed source fields produce a changed hash.
- Generated text is concise and readable.

### Step 3: Embedding Indexer

Status: `In Progress`

Tasks:

- Add OpenAI embedding client wrapper.
- Add indexing service that creates or updates RAG documents.
- Add manual backfill command.
- Add retry-safe failure handling.

Exit criteria:

- Running the indexer on seeded catalog data creates RAG documents.
- Re-running the indexer skips unchanged rows.
- Mocked embedding failures are logged and retryable.

### Step 4: Retrieval Service

Status: `Done`

Tasks:

- Embed incoming query text.
- Perform pgvector similarity search.
- Apply metadata filters.
- Return top context with source metadata and scores.

Exit criteria:

- Retrieval returns relevant seeded documents.
- Filters reduce results correctly.
- Weak or empty retrieval results are represented explicitly.

### Step 5: Chat Orchestration

Status: `In Progress`

Tasks:

- Add intent and filter extraction through the nano model.
- Fetch compact user personalization context.
- Assemble grounded prompt.
- Generate structured answer through the mini model.
- Persist user and assistant messages.

Exit criteria:

- Recommendation questions return grounded manga suggestions.
- Continue-reading questions can use user progress context.
- Low-confidence questions produce a safe fallback.

### Step 6: Chat API

Status: `Done`

Tasks:

- Add authenticated chat message endpoint.
- Add conversation list endpoint.
- Add conversation messages endpoint.
- Add archive/delete endpoint.
- Add validation and rate limits.

Exit criteria:

- Anonymous requests are rejected.
- Users can only access their own conversations.
- API responses include source data usable by the frontend.

### Step 7: Floating Widget

Status: `Done`

Tasks:

- Add authenticated global chat button.
- Add chat panel with message list, input, loading, error, and retry states.
- Add source links and suggested actions.
- Preserve state across route navigation.

Exit criteria:

- Logged-in user can ask a question from any page.
- Anonymous user does not see the widget.
- Source links navigate to relevant manga or reader pages.

### Step 8: Observability and Admin Follow-Up

Status: `In Progress`

Tasks:

- Add structured logs for indexing and chat.
- Add retrieval/generation metrics in logs.
- Add admin-visible indexing status later if needed.

Exit criteria:

- Failed chat requests can be diagnosed from logs.
- Index health can be checked without inspecting the database manually.

### Step 9: Full Verification

Status: `In Progress`

Tasks:

- Run backend unit and integration tests.
- Run frontend unit tests.
- Run workspace typecheck.
- Run workspace build.
- Manually smoke-test the widget in the browser.

Exit criteria:

- Tests pass.
- Typecheck passes.
- Build passes.
- Authenticated widget works against a locally indexed catalog.

## Rollout Plan

1. Ship database and indexing behind a disabled chat flag.
2. Run local backfill and inspect retrieval quality.
3. Enable backend chat endpoint for authenticated local users.
4. Add frontend widget behind the same capability check.
5. Verify with seeded catalog data.
6. Enable in production only after pgvector migration, indexing, and OpenAI config are present.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Poor retrieval quality | Tune document text, top-K, score threshold, and metadata filters before changing models. |
| OpenAI cost growth | Use nano for classification, mini for final answers, batch embeddings, and skip unchanged documents. |
| Slow responses | Cache stable retrieval where safe, keep context small, and measure retrieval/generation latency separately. |
| Hallucinated manga facts | Enforce grounded prompts and weak-context fallback. |
| User privacy leakage | Summarize user context, scope conversations by user id, and avoid sensitive fields in prompts/logs. |
| pgvector deploy friction | Add explicit local and production setup checks before enabling chat. |

## Later Work

- Hybrid tool-calling flow for exact catalog search, library lookup, and reader navigation.
- Admin panel for indexing status and manual reindex.
- Conversation title generation.
- Per-user chat preferences.
- Feedback buttons on assistant responses.
- Evaluation dataset for common manga discovery questions.
- Reader-page contextual actions with explicit confirmation.
- Text-content RAG only if chapter text is legally available and stored as text.

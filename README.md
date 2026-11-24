# KathaForge

A Telugu YouTube planning studio for food history, local stories, and traditions. Generate ten ideas, compare existing videos, and turn a topic into an editable episode with two Shorts, a shot list, and a YouTube description.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Developer mode uses Next.js for the interface and NestJS for the API on the same port. To run a production build, use `npm run build` followed by `npm start`. Run `npm test` for the automated checks.

## Live research and drafts

Copy `.env.example` to `.env`. All credentials are optional and read server-side.

| Setting | Enables |
| --- | --- |
| `YOUTUBE_API_KEY` | Comparable YouTube videos with channel, date, and view count |
| `BRAVE_SEARCH_API_KEY` | Web search leads for historical research |
| `LLM_API_KEY`, `LLM_MODEL` | AI-generated ideas and Telugu drafts when web research leads are available |
| `LLM_BASE_URL` | OpenAI-compatible Chat Completions endpoint, defaults to the OpenAI API |

When a provider is unavailable, the studio displays the lookup status and can still return starter ideas or an episode template. Source snippets are leads to review before recording. The YouTube sample does not estimate total audience demand.

Drafts and planned dates are saved in the current browser. Download Markdown to keep an independent copy. This initial release runs on localhost by default. Add authentication and rate limits before exposing a credentialed instance publicly. The calendar is a planning view. Video rendering, scheduled research, YouTube publishing, and analytics are outside this release.

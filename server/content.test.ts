import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultTopic, episodeMarkdown, episodeSchema, ideaSchema, starterEpisode, starterIdeas, topicSchema } from './content.ts'
import { generateEpisode, generateIdeas } from './providers.ts'

test('starter mode returns ten unique, valid ideas for curated and custom topics', () => {
  const custom = 'గోల్కొండ కోట'
  for (const topic of [defaultTopic, custom, 'అ'.repeat(120)]) {
    const ideas = starterIdeas(topicSchema.parse(topic))
    assert.equal(ideas.length, 10)
    assert.equal(new Set(ideas.map(idea => idea.title)).size, 10)
    assert.ok(ideas.every(idea => ideaSchema.safeParse(idea).success))
  }
  assert.ok(starterIdeas(custom).every(idea => idea.title.startsWith(custom)))
})

test('fallback draft is editable and exports its components and research leads', () => {
  const idea = starterIdeas(defaultTopic)[0]
  const episode = episodeSchema.parse(starterEpisode(idea))
  const markdown = episodeMarkdown(idea, episode, [{ title: 'Example', url: 'https://example.com', snippet: '' }])
  assert.ok(markdown.startsWith('# ' + idea.title))
  for (const heading of ['Script', 'Short 1', 'Short 2', 'Shot list', 'Description', 'Research leads']) {
    assert.ok(markdown.includes('## ' + heading))
  }
  assert.ok(markdown.includes('https://example.com'))
})

test('unconfigured providers still produce starter results', async () => {
  const batch = await generateIdeas(defaultTopic)
  assert.equal(batch.mode, 'starter')
  assert.equal(batch.videoStatus, 'missing')
  assert.equal(batch.sourceStatus, 'missing')
  const response = await generateEpisode(batch.ideas[0])
  assert.equal(response.mode, 'starter')
  assert.equal(response.episode.shorts.length, 2)
})

test('configured providers supply comparison data, numbered sources, and validated AI output', async context => {
  for (const key of ['YOUTUBE_API_KEY', 'BRAVE_SEARCH_API_KEY', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL']) {
    const before = process.env[key]
    process.env[key] = key === 'LLM_BASE_URL' ? 'https://mock.example/v1' : 'test'
    context.after(() => {
      if (before === undefined) delete process.env[key]
      else process.env[key] = before
    })
  }
  const ideas = starterIdeas(defaultTopic)
  const episode = starterEpisode(ideas[0])
  const clipId = 'abcdefghijk'
  context.mock.method(globalThis, 'fetch', async (input: string | URL, options?: RequestInit) => {
    const url = new URL(input)
    if (url.pathname.endsWith('/search') && url.hostname === 'www.googleapis.com') {
      return Response.json({ items: [{ id: { videoId: clipId }, snippet: {
        title: 'Comparable video', channelTitle: 'Test channel', publishedAt: '2025-01-01T00:00:00Z'
      } }] })
    }
    if (url.pathname.endsWith('/videos')) {
      return Response.json({ items: [{ id: clipId, statistics: { viewCount: '42' } }] })
    }
    if (url.hostname === 'api.search.brave.com') {
      return Response.json({ web: { results: [{
        title: 'Archive', url: 'https://example.com/history', description: 'Research lead'
      }] } })
    }
    const { messages } = JSON.parse(String(options?.body))
    const request = JSON.parse(messages[1].content)
    if (request.idea) assert.equal(request.sources[0].number, 1)
    return Response.json({ choices: [{ message: { content: JSON.stringify(request.idea ? episode : { ideas }) } }] })
  })
  const batch = await generateIdeas(defaultTopic)
  assert.equal(batch.mode, 'ai')
  assert.equal(batch.videos.length, 1)
  assert.equal(batch.videos[0].views, '42')
  assert.equal(batch.sources[0].url, 'https://example.com/history')
  const draft = await generateEpisode(ideas[0])
  assert.equal(draft.mode, 'ai')
  assert.deepEqual(draft.episode, episode)
})

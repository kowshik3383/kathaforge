'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  defaultTopic, episodeMarkdown, starterIdeas,
  type Episode, type Evidence, type Idea, type IdeaBatch
} from '../server/content'

type Section = 'ideas' | 'editor' | 'calendar'
type Draft = Evidence & { idea: Idea; episode: Episode; mode: 'ai' | 'starter'; date: string }
type Workspace = { drafts: Draft[]; selected: string | null }

const initialBatch: IdeaBatch = {
  ideas: starterIdeas(defaultTopic), videos: [], sources: [],
  videoStatus: 'missing', sourceStatus: 'missing', mode: 'starter'
}
const tabs: Record<Section, string> = { ideas: 'Ideas', editor: 'Episode editor', calendar: 'Calendar' }
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
const countFormat = new Intl.NumberFormat('en-IN')
const storageKey = 'kathaforge-workspace-v1'

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch('/api/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'The request failed. Please try again.')
  return data
}

function EvidencePanel({ evidence }: { evidence: Evidence }) {
  return <div className="evidence">
    <section>
      <h3>Comparable YouTube videos</h3>
      {evidence.videos.length ? <ul>{evidence.videos.map(video => <li key={video.url}>
        <a href={video.url} target="_blank" rel="noreferrer">{video.title}</a>
        <small>{video.channel} · {video.date.slice(0, 10)} · {video.views === null ? 'Views unavailable' : countFormat.format(Number(video.views)) + ' views'}</small>
      </li>)}</ul> : <p>{evidence.videoStatus === 'error' ? 'YouTube lookup failed. Try again or check provider credentials.' :
        evidence.videoStatus === 'ready' ? 'No comparable videos were returned for this search.' : 'Configure the YouTube provider to see comparable videos.'}</p>}
      <small>Search results are a sample. Views measure past performance on these uploads.</small>
    </section>
    <section>
      <h3>Research leads</h3>
      {evidence.sources.length ? <ol>{evidence.sources.map(source => <li key={source.url}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
        <small>{source.snippet}</small>
      </li>)}</ol> : <p>{evidence.sourceStatus === 'error' ? 'Web research failed. Try again or check provider credentials.' :
        evidence.sourceStatus === 'ready' ? 'No research leads were returned.' : 'Configure the web search provider to find research leads.'}</p>}
    </section>
  </div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export default function Studio() {
  const [section, setSection] = useState<Section>('ideas')
  const [topic, setTopic] = useState(defaultTopic)
  const [batchTopic, setBatchTopic] = useState(defaultTopic)
  const [batch, setBatch] = useState(initialBatch)
  const [workspace, setWorkspace] = useState<Workspace>({ drafts: [], selected: null })
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const draft = workspace.drafts.find(item => item.idea.title === workspace.selected)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const value = JSON.parse(saved) as Workspace
        if (Array.isArray(value.drafts)) setWorkspace(value)
      }
    } catch {
      setStorageError('Saved drafts could not be read in this browser.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace))
    } catch {
      setStorageError('This browser could not save your drafts. Download drafts to keep your changes.')
    }
  }, [ready, workspace])

  async function findIdeas(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending('ideas')
    setError('')
    try {
      const query = topic.trim()
      setBatch(await post<IdeaBatch>('ideas', { topic: query }))
      setBatchTopic(query)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Ideas could not be generated.')
    } finally {
      setPending(null)
    }
  }

  function openDraft(title: string) {
    setWorkspace(current => ({ ...current, selected: title }))
    setSection('editor')
  }

  async function makeDraft(idea: Idea) {
    if (workspace.drafts.some(item => item.idea.title === idea.title)) return openDraft(idea.title)
    if (pending) return
    setPending(idea.title)
    setError('')
    try {
      const result = await post<Omit<Draft, 'idea' | 'date'>>('episode', idea)
      setWorkspace(current => ({
        drafts: [...current.drafts, { ...result, idea, date: '' }], selected: idea.title
      }))
      setSection('editor')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The episode could not be generated.')
    } finally {
      setPending(null)
    }
  }

  function updateDraft(patch: Partial<Draft>) {
    setWorkspace(current => ({
      ...current,
      drafts: current.drafts.map(item => item.idea.title === current.selected ? { ...item, ...patch } : item)
    }))
  }

  function exportDraft(item: Draft) {
    const text = episodeMarkdown(item.idea, item.episode, item.sources)
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'kathaforge-episode.md'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function selectSection(value: Section) {
    setError('')
    setSection(value)
  }

  return <>
    <header className="topbar">
      <div className="top-inner">
        <button className="brand" onClick={() => selectSection('ideas')} aria-label="KathaForge home">
          <span className="brand-mark" lang="te">క</span><span>KathaForge</span>
        </button>
        <nav aria-label="Studio">
          {(Object.keys(tabs) as Section[]).map(tab => <button key={tab}
            aria-current={section === tab ? 'page' : undefined} onClick={() => selectSection(tab)}>{tabs[tab]}</button>)}
        </nav>
      </div>
    </header>
    <main>
      {error && <p className="message" role="alert">{error}</p>}
      {storageError && <p className="message" role="status">{storageError}</p>}
      {pending && <p className="message working" role="status">{pending === 'ideas' ? 'Researching your topic…' : 'Preparing your episode…'}</p>}
      {section === 'ideas' && <>
        <section className="hero">
          <div>
            <p className="eyebrow">TELUGU CONTENT STUDIO</p>
            <h1>Find your next story.</h1>
            <p>Explore Telugu video ideas and turn the ones worth telling into editable episodes.</p>
          </div>
          <form onSubmit={findIdeas}>
            <Field label="Topic"><input lang="te" required minLength={2} maxLength={120} value={topic} onChange={event => setTopic(event.target.value)} /></Field>
            <button type="submit" className="primary" disabled={Boolean(pending)}>Generate 10 ideas <span aria-hidden="true">↗</span></button>
          </form>
        </section>
        <div className="section-head">
          <div><p className="eyebrow">{batch.mode === 'ai' ? 'AI-GENERATED IDEAS' : 'STARTER IDEAS'}</p><h2 lang="te">{batchTopic}</h2></div>
          <span className="quiet">{batch.ideas.length} ideas</span>
        </div>
        <details className="comparison">
          <summary>Topic research and comparable videos</summary>
          <EvidencePanel evidence={batch} />
        </details>
        <div className="grid">
          {batch.ideas.map((idea, index) => <article className="card" key={idea.title + index}>
            <p className="effort">{idea.effort} production effort</p>
            <h3 lang="te">{idea.title}</h3>
            <p>{idea.angle}</p>
            <p className="question">{idea.question}</p>
            <button className="text-button" disabled={Boolean(pending)} onClick={() => makeDraft(idea)}>
              {workspace.drafts.some(item => item.idea.title === idea.title) ? 'Open episode' : 'Turn into an episode'} <span aria-hidden="true">↗</span>
            </button>
          </article>)}
        </div>
      </>}
      {section === 'editor' && <>
        <div className="section-head standalone"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Episode editor</h1></div>
          {draft && <button className="primary" onClick={() => exportDraft(draft)}>Download draft</button>}
        </div>
        {draft ? <>
          <section className="panel">
            <Field label="Saved episode"><select lang="te" value={draft.idea.title} onChange={event => openDraft(event.target.value)}>
              {workspace.drafts.map(item => <option key={item.idea.title}>{item.idea.title}</option>)}
            </select></Field>
            <p className="quiet">{draft.mode === 'ai' ? 'AI draft. Review claims against the sources before recording.' : 'Starter template. Fill in the brackets with verified research.'}</p>
            <div className="editor-fields" lang="te">
              <Field label="Opening hook"><input value={draft.episode.hook} onChange={event => updateDraft({ episode: { ...draft.episode, hook: event.target.value } })} /></Field>
              <Field label="Main script"><textarea rows={11} value={draft.episode.script} onChange={event => updateDraft({ episode: { ...draft.episode, script: event.target.value } })} /></Field>
              <div className="shorts">{([0, 1] as const).map(index => <Field key={index} label={'Short ' + (index + 1)}>
                <textarea rows={5} value={draft.episode.shorts[index]} onChange={event => {
                  const shorts: Episode['shorts'] = [...draft.episode.shorts]
                  shorts[index] = event.target.value
                  updateDraft({ episode: { ...draft.episode, shorts } })
                }} />
              </Field>)}</div>
              <Field label="Shot list (one per line)"><textarea rows={5} value={draft.episode.shots.join('\n')} onChange={event => updateDraft({ episode: { ...draft.episode, shots: event.target.value.split('\n') } })} /></Field>
              <Field label="YouTube description"><textarea rows={5} value={draft.episode.description} onChange={event => updateDraft({ episode: { ...draft.episode, description: event.target.value } })} /></Field>
            </div>
            <div className="date-field"><Field label="Planned publish date"><input type="date" value={draft.date} onChange={event => updateDraft({ date: event.target.value })} /></Field></div>
          </section>
          <section className="panel"><h2>Episode research</h2><EvidencePanel evidence={draft} /></section>
        </> : <div className="panel empty"><h2>Choose an idea to start your first episode.</h2><button className="primary" onClick={() => selectSection('ideas')}>Browse ideas</button></div>}
      </>}
      {section === 'calendar' && <>
        <div className="section-head standalone"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Content calendar</h1></div></div>
        <div className="panel">
          {workspace.drafts.length ? <ul className="calendar-list">{[...workspace.drafts].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map(item =>
            <li key={item.idea.title}><button className="text-button" lang="te" onClick={() => openDraft(item.idea.title)}>{item.idea.title}</button>
              <span>{item.date ? dateFormat.format(new Date(item.date + 'T00:00:00Z')) : 'Unscheduled'}</span></li>)}</ul>
          : <div className="empty"><h2>Your drafts will appear here.</h2><button className="primary" onClick={() => selectSection('ideas')}>Browse ideas</button></div>}
        </div>
      </>}
    </main>
  </>
}

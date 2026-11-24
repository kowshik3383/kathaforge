import { z } from 'zod'

const line = z.string().trim().min(1).max(400)
export const ideaSchema = z.object({
  title: line,
  angle: line,
  question: line,
  effort: z.enum(['Low', 'Medium', 'High'])
})
export const topicSchema = z.string().trim().min(2).max(120)
export const episodeSchema = z.object({
  hook: line,
  script: z.string().trim().min(1).max(10000),
  shorts: z.tuple([z.string().trim().min(1).max(2000), z.string().trim().min(1).max(2000)]),
  shots: z.array(line).min(1).max(12),
  description: z.string().trim().min(1).max(2000)
})

export type Idea = z.infer<typeof ideaSchema>
export type Episode = z.infer<typeof episodeSchema>
export type Source = { title: string; url: string; snippet: string }
export type Video = { title: string; url: string; channel: string; date: string; views: string | null }
export type Evidence = {
  videos: Video[]
  sources: Source[]
  videoStatus: 'ready' | 'missing' | 'error'
  sourceStatus: 'ready' | 'missing' | 'error'
}
export type IdeaBatch = Evidence & { ideas: Idea[]; mode: 'ai' | 'starter' }

export const defaultTopic = 'తెలుగు వంటల చరిత్ర'
const seeds = [
  ['మిరపకాయలు రాకముందు మన వంటల్లో కారం ఎలా తెచ్చేవారు?', 'Compare the spices cooks used before chillies.', 'Which older sources name those spices?'],
  ['పూతరేకులు అంటే ఆత్రేయపురమే ఎందుకు గుర్తొస్తుంది?', 'Tell the story through a local maker.', 'When did the craft become associated with the village?'],
  ['హైదరాబాద్‌లో బిర్యానీకి ఇంత పేరు ఎలా వచ్చింది?', 'Trace the dish through the city and its kitchens.', 'Which records describe its local popularity?'],
  ['ఉగాది పచ్చడిలో ఆరు రుచులు ఎందుకు?', 'Explore how families explain the festival dish.', 'How do explanations differ across regions?'],
  ['గోంగూరకు మన వంటింట్లో ఇంత ప్రత్యేకత ఎందుకు?', 'Follow the ingredient through everyday meals.', 'Which regional dishes illustrate its different uses?'],
  ['సంక్రాంతికి అరిసెలు ఎందుకు చేస్తారు?', 'Connect the dish with the harvest and family traditions.', 'How far back can the festival association be traced?'],
  ['సాంబార్ ఎలా మొదలైంది?', 'Examine the competing stories behind the dish.', 'Which accounts can be traced to written sources?'],
  ['పెసరట్టు మన టిఫిన్ ప్లేట్లోకి ఎలా వచ్చింది?', 'Look for a local breakfast story.', 'Which older recipes or menus mention pesarattu?'],
  ['రాగి సంగటి కథేంటి?', 'Explore the links between farming and regional food.', 'Where can regional variations be documented?'],
  ['మన ఇంటి ఊరగాయల కథేంటి?', 'Show how households preserve seasonal produce.', 'Which techniques and ingredients vary by place?']
] as const

const approaches = [
  ['కథ ఎక్కడ మొదలైంది?', 'Trace the earliest available record.'],
  ['కాలంతో ఎలా మారింది?', 'Compare an older description with the present day.'],
  ['గురించి మనం విన్న కథ నిజమేనా?', 'Check a popular story against independent sources.'],
  ['మన రోజువారీ జీవితంలోకి ఎలా వచ్చింది?', 'Show how people started using or sharing it.'],
  ['ప్రాంతానికో కథ ఉందా?', 'Compare two regional accounts.'],
  ['పేరు వెనుక కథేంటి?', 'Look for older uses of the name.'],
  ['గురించి పాత పుస్తకాలు ఏం చెబుతున్నాయి?', 'Use an archival document as the visual anchor.'],
  ['గురించి మన పెద్దలు ఏం చెబుతున్నారు?', 'Build the episode around an interview.'],
  ['ఇప్పటికీ ఎందుకు గుర్తుంది?', 'Connect collective memory with a concrete example.'],
  ['కథను ఒక మ్యాప్‌తో చెప్పొచ్చా?', 'Trace places with verified dates and references.']
] as const

export function starterIdeas(topic: string): Idea[] {
  const rows = topic === defaultTopic
    ? seeds
    : approaches.map(([title, angle]) => [topic + ' — ' + title, angle, 'What can independent sources verify?'] as const)
  return rows.map(([title, angle, question], index) => ({
    title, angle, question, effort: index === 1 ? 'Medium' : 'Low'
  }))
}

export function starterEpisode(idea: Idea): Episode {
  return {
    hook: idea.title,
    script: `${idea.title}\n\n[ఇక్కడ ప్రేక్షకులకు తెలిసిన ఒక ఉదాహరణ చూపించండి.]\n\n[మీ ప్రశ్నకు సంబంధించి ఆధారాలతో నిర్ధారించిన విషయాన్ని వివరించండి.]\n\n[వేర్వేరు కథనాలు ఉంటే, వాటికి ఉన్న ఆధారాలను చెప్పండి.]\n\n[ఈ కథ మన రోజువారీ జీవితానికి ఎలా సంబంధించిందో వివరించండి.]\n\nఈ విషయం గురించి మీ ఊరిలో ఏమని చెబుతారు? కామెంట్‌లో చెప్పండి.`,
    shorts: [
      `${idea.title}\n[ఒక దృశ్యం చూపించి, ఆధారాలతో నిర్ధారించిన ఒక విషయాన్ని చెప్పండి.]`,
      'మీ ఊరిలో దీని గురించి ఏం చెబుతారు? [ఒక స్థానిక ఉదాహరణ చూపించి, ప్రేక్షకుల అనుభవాన్ని అడగండి.]'
    ],
    shots: ['విషయానికి సంబంధించిన క్లోజప్', 'ఆధారం లేదా పాత ఫొటో', 'స్థలం లేదా మ్యాప్', 'ముగింపులో ప్రేక్షకులకు ప్రశ్న'],
    description: `${idea.title}\n\nఈ కథలో స్థానిక అనుభవాలు, చారిత్రక ఆధారాలు పరిశీలిద్దాం.\n\n[నిర్ధారించిన ఆధారాల లింకులు ఇక్కడ చేర్చండి.]`
  }
}

export function episodeMarkdown(idea: Idea, episode: Episode, sources: Source[]): string {
  return [
    '# ' + idea.title,
    '## Hook\n\n' + episode.hook,
    '## Script\n\n' + episode.script,
    '## Short 1\n\n' + episode.shorts[0],
    '## Short 2\n\n' + episode.shorts[1],
    '## Shot list\n\n' + episode.shots.map(shot => '- ' + shot).join('\n'),
    '## Description\n\n' + episode.description,
    '## Research leads\n\n' + (sources.map(source => '- ' + source.title + ' — ' + source.url).join('\n') || 'Add verified sources before publication.')
  ].join('\n\n') + '\n'
}

import 'reflect-metadata'
import { BadRequestException, Body, Controller, Module, Post } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import next from 'next'
import { ideaSchema, topicSchema } from './content.ts'
import { generateEpisode, generateIdeas } from './providers.ts'

class StudioController {
  ideas(body: { topic?: unknown } | null) {
    const topic = topicSchema.safeParse(body?.topic)
    if (!topic.success) throw new BadRequestException('Enter a topic between 2 and 120 characters.')
    return generateIdeas(topic.data)
  }

  episode(body: unknown) {
    const idea = ideaSchema.safeParse(body)
    if (!idea.success) throw new BadRequestException('Choose a valid episode idea.')
    return generateEpisode(idea.data)
  }
}

for (const method of ['ideas', 'episode'] as const) {
  const descriptor = Object.getOwnPropertyDescriptor(StudioController.prototype, method)!
  Post(method)(StudioController.prototype, method, descriptor)
  Body()(StudioController.prototype, method, 0)
}
Controller('api')(StudioController)

class StudioModule {}
Module({ controllers: [StudioController] })(StudioModule)

const hostname = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || '3000')
const frontend = next({ dev: process.argv.includes('--dev'), hostname, port })
await frontend.prepare()

const app = await NestFactory.create(StudioModule)
const handle = frontend.getRequestHandler()
app.use((request: Parameters<typeof handle>[0], response: Parameters<typeof handle>[1], nextMiddleware: () => void) => {
  if (request.url?.split('?')[0].startsWith('/api/')) return nextMiddleware()
  void handle(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500)
    response.end()
  })
})
await app.listen(port, hostname)

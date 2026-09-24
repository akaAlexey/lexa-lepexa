/**
 * Сборка OpenAPI 3.0 из zod-схем и таблицы эндпоинтов.
 * Результат — docs/openapi.json (npm run contract); тест следит, чтобы файл не отставал от кода.
 */
import { z } from 'zod'
import { endpoints, notificationStream } from './endpoints.ts'
import { descriptions, registry } from './schemas.ts'

const ref = (id: string) => `#/components/schemas/${id}`

/** Тела и ответы — только сущности контракта или массивы сущностей. */
function schemaRef(schema: z.ZodType): object {
  if (schema instanceof z.ZodArray)
    return { type: 'array', items: schemaRef(schema.element as z.ZodType) }
  const meta = registry.get(schema)
  if (!meta) throw new Error('Эндпоинт ссылается на схему вне контракта — оберните её в entity()')
  return { $ref: ref(meta.id) }
}

export function buildOpenApi() {
  const { schemas } = z.toJSONSchema(registry, {
    target: 'openapi-3.0',
    uri: ref,
    unrepresentable: 'any',
  }) as { schemas: Record<string, Record<string, unknown>> }
  for (const [id, s] of Object.entries(schemas)) {
    delete s.$id
    s.description = descriptions[id]
  }

  const paths: Record<string, Record<string, object>> = {}
  for (const [operationId, e] of Object.entries(endpoints)) {
    const params = [...e.path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }))
    const op: Record<string, unknown> = {
      operationId,
      summary: e.summary,
      responses: {
        '200': {
          description: 'OK',
          content: { 'application/json': { schema: schemaRef(e.response) } },
        },
        '4XX': { description: 'Ошибка запроса: { "message": string }' },
      },
    }
    if (params.length) op.parameters = params
    if ('body' in e && e.body) {
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: schemaRef(e.body) } },
      }
    }
    const openApiPath = (paths[e.path] ??= {})
    openApiPath[e.method.toLowerCase()] = op
  }
  paths[notificationStream.path] = {
    get: {
      operationId: 'notificationStream',
      summary: 'Поток уведомлений (Server-Sent Events). data каждого события — AppNotification',
      responses: {
        '200': {
          description: 'text/event-stream',
          content: { 'text/event-stream': { schema: { $ref: ref('AppNotification') } } },
        },
      },
    },
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Тропа памяти: Последний бой — API',
      version: '0.1.0',
      description:
        'Контракт, который ожидает фронтенд. Источник правды — frontend/src/contract (zod). Сгенерировано: npm run contract.',
    },
    servers: [{ url: '/api/v1', description: 'Тот же домен, что и фронт (прокси)' }],
    paths,
    components: { schemas },
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

type ApiErrorPayload = {
  detail?: string
}

export type ChatRequest = {
  model?: string
  system_prompt: string
  user_message: string
  stream: boolean
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    if (payload.detail) {
      return payload.detail
    }
  } catch {}

  return fallback
}

function processStreamEvent(
  event: string,
  onChunk: (chunk: string) => void,
): void {
  if (!event.startsWith('data:')) {
    return
  }

  const payload = event.replace(/^data:\s*/, '')
  if (payload === '[DONE]') {
    return
  }

  try {
    const parsed = JSON.parse(payload) as { content?: string }
    if (parsed.content) {
      onChunk(parsed.content)
    }
  } catch {
    throw new Error('Invalid streaming payload from backend')
  }
}

export async function fetchModels(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/models`)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to load models'))
  }

  const data = (await response.json()) as { models: string[] }
  return data.models
}

export async function streamChat(
  body: ChatRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to stream response'))
  }

  if (!response.body) {
    throw new Error('Streaming response body is unavailable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const event = buffer.slice(0, boundary).trim()
      buffer = buffer.slice(boundary + 2)

      processStreamEvent(event, onChunk)

      boundary = buffer.indexOf('\n\n')
    }
  }

  buffer += decoder.decode()
  const pendingEvent = buffer.trim()
  if (pendingEvent) {
    processStreamEvent(pendingEvent, onChunk)
  }
}

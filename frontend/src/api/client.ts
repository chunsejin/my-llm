const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export type ChatRequest = {
  model?: string
  system_prompt: string
  user_message: string
  stream: boolean
}

export async function fetchModels(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/models`)
  if (!response.ok) {
    throw new Error('Failed to load models')
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

  if (!response.ok || !response.body) {
    throw new Error('Failed to stream response')
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

      if (event.startsWith('data:')) {
        const payload = event.replace(/^data:\s*/, '')

        let parsed: { content?: string; error?: string }
        try {
          parsed = JSON.parse(payload) as { content?: string; error?: string }
        } catch {
          throw new Error('Invalid streaming payload from backend')
        }

        if (parsed.error) {
          throw new Error(parsed.error)
        }
        if (parsed.content) {
          onChunk(parsed.content)
        }
      }

      boundary = buffer.indexOf('\n\n')
    }
  }
}

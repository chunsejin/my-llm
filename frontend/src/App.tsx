import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchModels, streamChat } from './api/client'
import './App.css'

function App() {
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [userMessage, setUserMessage] = useState('')
  const [responseText, setResponseText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const nextModels = await fetchModels()
        setModels(nextModels)
        if (nextModels.length > 0) {
          setSelectedModel(nextModels[0])
        }
      } catch {
        setError('Failed to load models. Check Ollama status.')
      }
    }

    void load()
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userMessage.trim()) return

    setError('')
    setResponseText('')
    setIsLoading(true)

    try {
      await streamChat(
        {
          model: selectedModel || undefined,
          system_prompt: systemPrompt,
          user_message: userMessage,
          stream: true,
        },
        (chunk) => {
          setResponseText((prev) => prev + chunk)
        },
      )
    } catch {
      setError('An error occurred while streaming the response.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container">
      <h1>Local LLM Chat</h1>
      <form className="panel" onSubmit={onSubmit}>
        <label>
          Model
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
          >
            {models.length === 0 ? <option value="">No models</option> : null}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        <label>
          System prompt
          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            rows={3}
          />
        </label>

        <label>
          Message
          <textarea
            value={userMessage}
            onChange={(event) => setUserMessage(event.target.value)}
            rows={4}
            placeholder="Ask something..."
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Streaming...' : 'Send'}
        </button>
      </form>

      <section className="panel">
        <h2>Response stream</h2>
        <pre>{responseText || 'Response will appear here.'}</pre>
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  )
}

export default App

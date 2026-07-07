import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchModels, streamChat } from './api/client'
import './App.css'

type ModelStatus = 'loading' | 'ready' | 'empty' | 'error'
type ChatStatus = 'idle' | 'streaming' | 'done' | 'error'

function getResponseStatusMessage(params: {
  error: string
  isLoading: boolean
  responseText: string
  chatStatus: ChatStatus
  modelStatus: ModelStatus
}): string {
  const { error, isLoading, responseText, chatStatus, modelStatus } = params

  if (error) {
    return error
  }

  if (isLoading) {
    return responseText
      ? 'Streaming response...'
      : 'Waiting for the model to start responding...'
  }

  if (chatStatus === 'done') {
    return responseText
      ? 'Response complete.'
      : 'The request finished without any response content.'
  }

  if (modelStatus === 'loading') {
    return 'Loading available models...'
  }

  if (modelStatus === 'empty') {
    return 'No models are available yet. Start Ollama or pull a model, then refresh.'
  }

  return 'Send a message to start the conversation.'
}

function getResponsePlaceholder(params: {
  error: string
  isLoading: boolean
  chatStatus: ChatStatus
}): string {
  const { error, isLoading, chatStatus } = params

  if (error) {
    return 'No response available because the request failed.'
  }

  if (isLoading) {
    return 'Waiting for streamed content...'
  }

  if (chatStatus === 'done') {
    return 'The conversation ended without any streamed content.'
  }

  return 'Response will appear here after you send a message.'
}

function App() {
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>()
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [userMessage, setUserMessage] = useState('')
  const [responseText, setResponseText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [chatStatus, setChatStatus] = useState<ChatStatus>('idle')

  useEffect(() => {
    const load = async () => {
      try {
        const nextModels = await fetchModels()
        setModels(nextModels)
        setSelectedModel(nextModels[0])
        setModelStatus(nextModels.length > 0 ? 'ready' : 'empty')
      } catch (error) {
        setModelStatus('error')
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load models. Check Ollama status.',
        )
      }
    }

    void load()
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = userMessage.trim()
    if (!trimmedMessage) {
      setError('Enter a message to start the conversation.')
      return
    }

    setError('')
    setResponseText('')
    setIsLoading(true)
    setChatStatus('streaming')

    try {
      await streamChat(
        {
          model: selectedModel,
          system_prompt: systemPrompt,
          user_message: trimmedMessage,
          stream: true,
        },
        (chunk) => {
          setResponseText((prev) => prev + chunk)
        },
      )
      setChatStatus('done')
    } catch (error) {
      setChatStatus('error')
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred while streaming the response.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const responseStatus = getResponseStatusMessage({
    error,
    isLoading,
    responseText,
    chatStatus,
    modelStatus,
  })
  const responsePlaceholder = getResponsePlaceholder({
    error,
    isLoading,
    chatStatus,
  })

  return (
    <main className="container">
      <h1>Local LLM Chat</h1>
      <form className="panel" onSubmit={onSubmit}>
        <label>
          Model
          <select
            value={selectedModel ?? ''}
            disabled={modelStatus !== 'ready'}
            onChange={(event) =>
              setSelectedModel(event.target.value || undefined)
            }
          >
            {models.length === 0 ? <option value="">No models available</option> : null}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        {modelStatus === 'loading' ? (
          <p className="status">Loading models...</p>
        ) : null}

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

        <button type="submit" disabled={isLoading || modelStatus !== 'ready'}>
          {isLoading ? 'Streaming...' : 'Send'}
        </button>
      </form>

      <section className="panel">
        <h2>Response stream</h2>
        <p className={error ? 'status error' : 'status'} aria-live="polite">
          {responseStatus}
        </p>
        <pre aria-busy={isLoading}>{responseText || responsePlaceholder}</pre>
      </section>
    </main>
  )
}

export default App

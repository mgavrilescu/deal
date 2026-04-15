"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { saveMessage } from "@/actions/messages"
import { analyzeMessage } from "@/actions/coach"
import { updateTensionHistory } from "@/actions/session"
import TechniqueTag from "./TechniqueTag"
import TensionMeter from "./TensionMeter"
import CoachSidebar from "./CoachSidebar"

interface Message {
  id: string
  role: "user" | "counterpart"
  content: string
  sequence: number
  techniquesDetected: string[]
  techniquesMissed: string[]
  coachNote: string | null
}

interface CoachResult {
  detected: string[]
  missed: string[]
  note: string
  tension_impact: "up" | "down" | "neutral"
}

interface ScenarioContext {
  userRole: string
  counterpartProfile: string
  goal: string
  description: string
}

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: Message[]
  initialTension: number
  scenarioContext: ScenarioContext
  difficulty: string
  onEnd: () => void | Promise<void>
}

export default function ChatInterface({
  sessionId,
  initialMessages,
  initialTension,
  scenarioContext,
  difficulty,
  onEnd,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streamingText, setStreamingText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [latestCoach, setLatestCoach] = useState<CoachResult | null>(null)
  const [tension, setTension] = useState(initialTension)
  const [isEnding, setIsEnding] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const sessionContextString = `${scenarioContext.description} (${difficulty})`

  // Scroll to bottom whenever messages change or streaming text changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  const requestCounterpart = useCallback(async () => {
    if (isStreaming) return
    setIsStreaming(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!res.ok || !res.body) {
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6)
          try {
            const event = JSON.parse(raw)

            if (event.error) {
              setIsStreaming(false)
              return
            }

            if (event.done) {
              // Persist counterpart message
              const saved = await saveMessage({
                sessionId,
                role: "counterpart",
                content: event.text,
                tensionDelta: event.tensionDelta,
                blackSwanRevealed: event.blackSwanRevealed,
              })

              // Update tension
              const newTension = await updateTensionHistory(
                sessionId,
                event.tensionDelta ?? 0
              )
              setTension(newTension)

              setMessages((prev) => [
                ...prev,
                {
                  id: saved.id,
                  role: "counterpart",
                  content: event.text,
                  sequence: saved.sequence,
                  techniquesDetected: [],
                  techniquesMissed: [],
                  coachNote: null,
                },
              ])
              setStreamingText("")
              setIsStreaming(false)
            } else if (event.text) {
              setStreamingText((prev) => prev + event.text)
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch {
      setIsStreaming(false)
    }
  }, [isStreaming, sessionId])

  // Auto-start: if no messages, get the counterpart's opening
  useEffect(() => {
    if (initialMessages.length === 0) {
      requestCounterpart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(async () => {
    const content = input.trim()
    if (!content || isStreaming) return

    setInput("")
    setIsAnalyzing(false)
    setLatestCoach(null)

    // Find last counterpart message for coach context
    const lastCounterpart = [...messages]
      .reverse()
      .find((m) => m.role === "counterpart")

    // Save user message
    const saved = await saveMessage({
      sessionId,
      role: "user",
      content,
    })

    const userMsg: Message = {
      id: saved.id,
      role: "user",
      content,
      sequence: saved.sequence,
      techniquesDetected: [],
      techniquesMissed: [],
      coachNote: null,
    }
    setMessages((prev) => [...prev, userMsg])

    // Fire coach analysis in background (non-blocking)
    if (lastCounterpart) {
      setIsAnalyzing(true)
      analyzeMessage({
        messageId: saved.id,
        sessionId,
        userMessage: content,
        counterpartLastMessage: lastCounterpart.content,
        sessionContext: sessionContextString,
      })
        .then((result) => {
          setLatestCoach(result)
          // Update the message in state with technique tags
          setMessages((prev) =>
            prev.map((m) =>
              m.id === saved.id
                ? {
                    ...m,
                    techniquesDetected: result.detected,
                    techniquesMissed: result.missed,
                    coachNote: result.note,
                  }
                : m
            )
          )
        })
        .catch(() => {
          // coach failure is non-critical
        })
        .finally(() => setIsAnalyzing(false))
    }

    // Get counterpart response
    await requestCounterpart()
  }, [input, isStreaming, messages, sessionId, sessionContextString, requestCounterpart])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEnd = async () => {
    if (isEnding) return
    setIsEnding(true)
    await onEnd()
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 truncate">
              {scenarioContext.userRole} ↔ {scenarioContext.counterpartProfile}
            </p>
            <p className="text-xs text-zinc-600 truncate mt-0.5 max-w-sm">
              Goal: {scenarioContext.goal}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="w-40">
              <TensionMeter value={tension} />
            </div>
            <button
              onClick={handleEnd}
              disabled={isEnding}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-zinc-700 hover:border-red-700 disabled:opacity-40"
            >
              End session
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[72%] space-y-1.5 ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-zinc-700 text-zinc-100 rounded-br-sm"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>

                {/* Technique tags on user messages */}
                {m.role === "user" &&
                  (m.techniquesDetected.length > 0 ||
                    m.techniquesMissed.length > 0) && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {m.techniquesDetected.map((t) => (
                        <TechniqueTag key={t} technique={t} type="detected" />
                      ))}
                      {m.techniquesMissed.map((t) => (
                        <TechniqueTag key={t} technique={t} type="missed" />
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* Streaming counterpart message */}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[72%]">
                <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed bg-zinc-800 text-zinc-200">
                  {streamingText}
                  <span className="inline-block w-1 h-3.5 bg-zinc-400 ml-0.5 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Thinking indicator when awaiting stream start */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-zinc-800">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your response… (Enter to send, Shift+Enter for newline)"
              disabled={isStreaming}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Coach sidebar */}
      <div className="w-72 shrink-0 border-l border-zinc-800 px-4 py-4 overflow-y-auto">
        <CoachSidebar latest={latestCoach} isAnalyzing={isAnalyzing} />
      </div>
    </div>
  )
}

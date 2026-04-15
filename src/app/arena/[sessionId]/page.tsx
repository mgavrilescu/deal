import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSession } from "@/actions/session"
import { getMessages } from "@/actions/messages"
import { generateDebrief } from "@/actions/debrief"
import ChatInterface from "@/components/negotiation/ChatInterface"

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function NegotiationPage({ params }: Props) {
  const { sessionId } = await params

  const authSession = await auth()
  if (!authSession?.user) redirect("/api/auth/signin")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    notFound()
  }

  if (session.status === "complete") {
    redirect(`/arena/${sessionId}/debrief`)
  }

  const dbMessages = await getMessages(sessionId)

  const ctx = session.scenarioContext as {
    userRole: string
    counterpartProfile: string
    goal: string
    description: string
  }

  const initialMessages = dbMessages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "counterpart",
    content: m.content,
    sequence: m.sequence,
    techniquesDetected: (m.techniquesDetected as string[]) ?? [],
    techniquesMissed: (m.techniquesMissed as string[]) ?? [],
    coachNote: m.coachNote ?? null,
  }))

  const tensionHistory = (session.tensionHistory as number[]) ?? []
  const currentTension =
    tensionHistory.length > 0 ? tensionHistory[tensionHistory.length - 1] : 0.5

  async function handleEnd() {
    "use server"
    await generateDebrief(sessionId)
    redirect(`/arena/${sessionId}/debrief`)
  }

  return (
    <ChatInterface
      sessionId={sessionId}
      initialMessages={initialMessages}
      initialTension={currentTension}
      scenarioContext={ctx}
      difficulty={session.difficulty}
      onEnd={handleEnd}
    />
  )
}

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { createSession } from "@/actions/session"
import { Button } from "@/components/ui/button"

export default async function ArenaSetupPage() {
  const session = await auth()
  if (!session?.user) redirect("/api/auth/signin")

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Arena
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Define your scenario and practice against an AI counterpart.
          </p>
        </div>

        <form action={createSession} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="userRole"
              className="block text-sm font-medium text-zinc-300"
            >
              Your role
            </label>
            <input
              id="userRole"
              name="userRole"
              type="text"
              required
              placeholder="e.g. Procurement manager, Tenant, Job candidate"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="counterpartProfile"
              className="block text-sm font-medium text-zinc-300"
            >
              Counterpart profile
            </label>
            <input
              id="counterpartProfile"
              name="counterpartProfile"
              type="text"
              required
              placeholder="e.g. Stubborn landlord, Senior recruiter at a FAANG company"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="goal"
              className="block text-sm font-medium text-zinc-300"
            >
              Your goal
            </label>
            <input
              id="goal"
              name="goal"
              type="text"
              required
              placeholder="e.g. Reduce rent by 15%, Get a $30k salary bump"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="scenarioDescription"
              className="block text-sm font-medium text-zinc-300"
            >
              Scenario description
            </label>
            <textarea
              id="scenarioDescription"
              name="scenarioDescription"
              required
              rows={3}
              placeholder="Set the scene. What's the situation? What's at stake? What's the tension?"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { value: "rookie", label: "Rookie", desc: "Softens easily" },
                  {
                    value: "negotiator",
                    label: "Negotiator",
                    desc: "Firm, holds position",
                  },
                  {
                    value: "tactical",
                    label: "Tactical",
                    desc: "Tests your composure",
                  },
                  {
                    value: "hostage",
                    label: "Hostage",
                    desc: "Maximum resistance",
                  },
                ] as const
              ).map((d) => (
                <label
                  key={d.value}
                  className="relative flex flex-col gap-0.5 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-center hover:border-zinc-500 has-[:checked]:border-zinc-300 has-[:checked]:bg-zinc-800"
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={d.value}
                    defaultChecked={d.value === "rookie"}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-zinc-200">
                    {d.label}
                  </span>
                  <span className="text-xs text-zinc-500">{d.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2 bg-white text-zinc-950 hover:bg-zinc-200"
          >
            Start negotiation
          </Button>
        </form>
      </div>
    </div>
  )
}

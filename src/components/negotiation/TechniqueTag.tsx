"use client"

const POSITIVE_LABELS: Record<string, string> = {
  label: "Label",
  mirror: "Mirror",
  calibrated_q: "Calibrated Q",
  accusation_audit: "Accusation Audit",
  tactical_silence: "Silence",
  that_is_right: "That's Right",
  no_oriented_q: "No-Oriented Q",
}

const NEGATIVE_LABELS: Record<string, string> = {
  compromised_early: "Early Concession",
  yes_ladder: "Yes Ladder",
  lost_frame: "Lost Frame",
  counter_anchored: "Counter-Anchored",
  gave_away_batna: "Gave Away BATNA",
  emotional_reaction: "Emotional React",
}

interface TechniqueTagProps {
  technique: string
  type: "detected" | "missed"
}

export default function TechniqueTag({ technique, type }: TechniqueTagProps) {
  const label =
    type === "detected"
      ? (POSITIVE_LABELS[technique] ?? technique)
      : (NEGATIVE_LABELS[technique] ?? technique)

  return (
    <span
      className={
        type === "detected"
          ? "inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
          : "inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-900/40 text-red-400 border border-red-700/40"
      }
    >
      {label}
    </span>
  )
}

interface StepperProps {
  steps: string[]
  currentStep: number
  accentColor: string
}

export default function Stepper({ steps, currentStep, accentColor }: StepperProps) {
  return (
    <nav className="rounded-xl border border-[#E8E4DE] bg-white px-4 py-3" aria-label="Progression">
      <ol
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((label, index) => {
          const isCurrent = index === currentStep
          const isDone = index < currentStep

          return (
            <li key={label} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                  isDone ? 'bg-[#22C55E] text-white' : isCurrent ? 'text-white' : 'bg-[#F0EEE9] text-[#B0ADA8]'
                }`}
                style={isCurrent ? { backgroundColor: accentColor } : undefined}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {index + 1}
              </span>
              <span
                className={`truncate text-xs ${
                  isCurrent ? 'font-medium text-[#1A1A1A]' : 'text-[#6B6B6B]'
                }`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

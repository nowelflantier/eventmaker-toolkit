interface StepperProps {
  steps: string[]
  currentStep: number
  accentColor: string
}

const columnClasses: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}

export default function Stepper({ steps, currentStep, accentColor }: StepperProps) {
  const gridColumns = columnClasses[steps.length] ?? 'md:grid-cols-4'

  return (
    <nav className="rounded-xl border border-[#E8E4DE] bg-white px-4 py-3" aria-label="Progression">
      <ol className={`grid gap-2 ${gridColumns}`}>
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

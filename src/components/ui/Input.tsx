import { InputHTMLAttributes, forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`h-11 w-full rounded-lg border border-[#E0DDD8] bg-white px-3 text-sm text-[#1A1A1A] outline-none transition placeholder:text-[#B0ADA8] focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 ${className}`}
      {...props}
    />
  ),
)

Input.displayName = 'Input'

export default Input

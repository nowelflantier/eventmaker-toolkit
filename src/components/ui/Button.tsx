import { ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#1A1A1A] text-white hover:bg-black',
  ghost: 'bg-transparent text-[#6B6B6B] hover:bg-[#F0EEE9] hover:text-[#1A1A1A]',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  ),
)

Button.displayName = 'Button'

export default Button

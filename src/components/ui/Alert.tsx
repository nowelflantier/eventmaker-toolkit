import { HTMLAttributes } from 'react'

export default function Alert({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 ${className}`}
      {...props}
    />
  )
}

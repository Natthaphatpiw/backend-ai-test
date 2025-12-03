import { Loader } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader className={`${sizeMap[size]} animate-spin text-accent-600`} />
      {message && <p className="text-primary-600">{message}</p>}
    </div>
  )
}

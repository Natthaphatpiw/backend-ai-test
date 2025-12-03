import { X } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onClose?: () => void
  type?: 'error' | 'warning' | 'info'
}

export default function ErrorAlert({
  message,
  onClose,
  type = 'error',
}: ErrorAlertProps) {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={`p-4 border rounded-lg flex items-center justify-between ${colors[type]}`}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity"
        >
          <X size={20} />
        </button>
      )}
    </div>
  )
}

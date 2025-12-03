import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  title: string
  showBackButton?: boolean
  backHref?: string
  rightContent?: React.ReactNode
}

export default function Header({
  title,
  showBackButton = false,
  backHref = '/',
  rightContent,
}: HeaderProps) {
  return (
    <header className="border-b border-primary-100 bg-white shadow-sm sticky top-0 z-50">
      <nav className="container flex items-center justify-between h-16">
        {showBackButton ? (
          <Link
            href={backHref}
            className="flex items-center gap-2 text-primary-700 hover:text-primary-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </Link>
        ) : (
          <div />
        )}
        <h1 className="text-2xl font-bold text-primary-900">{title}</h1>
        {rightContent || <div className="w-16" />}
      </nav>
    </header>
  )
}

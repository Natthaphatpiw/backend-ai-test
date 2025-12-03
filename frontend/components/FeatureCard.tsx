import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
}: FeatureCardProps) {
  return (
    <Link href={href}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer group h-full">
        <div className="flex items-center justify-center w-12 h-12 bg-accent-100 rounded-lg group-hover:bg-accent-200 transition-colors mb-4">
          <Icon className="text-accent-600" size={28} />
        </div>
        <h3 className="text-xl font-semibold text-primary-900 mb-2">
          {title}
        </h3>
        <p className="text-primary-600">
          {description}
        </p>
      </div>
    </Link>
  )
}

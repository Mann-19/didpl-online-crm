import Link from 'next/link';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'amber' | 'teal';
}

export default function ActionCard({ 
  title, 
  description, 
  icon, 
  href, 
  variant = 'blue' 
}: ActionCardProps) {
  
  const themes = {
    blue: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-blue-400',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      ctaText: 'text-blue-600'
    },
    green: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-emerald-400',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      ctaText: 'text-emerald-600'
    },
    purple: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-purple-400',
      iconBg: 'bg-purple-50',
      iconText: 'text-purple-600',
      ctaText: 'text-purple-600'
    },
    orange: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-orange-400',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-600',
      ctaText: 'text-orange-600'
    },
    amber: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-amber-400',
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-600',
      ctaText: 'text-amber-600'
    },
    teal: {
      bg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-teal-400',
      iconBg: 'bg-teal-50',
      iconText: 'text-teal-600',
      ctaText: 'text-teal-600'
    }
  };

  const t = themes[variant] || themes.blue;

  return (
    <Link 
      href={href}
      className={`
        group relative flex flex-col items-start p-6 h-full
        rounded-2xl border transition-all duration-200 ease-out
        ${t.bg} ${t.border} ${t.hoverBorder} hover:shadow-lg
      `}
    >
      <div className={`
        w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6
        transition-colors duration-200
        ${t.iconBg} ${t.iconText}
      `}>
        {icon}
      </div>

      <div className="flex-1 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-black mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          {description}
        </p>
      </div>

      <div className={`mt-auto flex items-center text-sm font-bold ${t.ctaText}`}>
        <span>Proceed</span>
        <svg 
          className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </Link>
  );
}

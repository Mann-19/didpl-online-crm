import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  href: string;
  dirname: string;
  accent?: 'blue' | 'amber' | 'teal' | 'emerald' | 'violet';
}

export default function BackLink({ href, dirname, accent = 'blue' }: BackLinkProps) {
  const accentColors = {
    blue: 'text-blue-600 hover:text-blue-800',
    amber: 'text-amber-600 hover:text-amber-800',
    teal: 'text-teal-600 hover:text-teal-800',
    emerald: 'text-emerald-600 hover:text-emerald-800',
    violet: 'text-violet-600 hover:text-violet-800',
  };

  return (
    <div className="mb-4">
      <Link href={href} className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${accentColors[accent]}`}>
        <ArrowLeft className="w-4 h-4" />
        Back to {dirname}
      </Link>
    </div>
  );
}

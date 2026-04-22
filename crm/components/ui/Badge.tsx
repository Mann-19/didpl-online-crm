interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
}

export default function Badge({ children, variant = 'gray' }: BadgeProps) {
  const styles = {
    success: 'bg-green-50 text-green-700 ring-green-600/20',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/10',
    info: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    purple: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/10',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}>
      {children}
    </span>
  );
}

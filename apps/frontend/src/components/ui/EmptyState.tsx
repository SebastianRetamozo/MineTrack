import { ReactNode } from 'react';
import { cn } from '../../utils/helpers';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {(action || (actionLabel && onAction)) && (
        <div className="mt-6">
          {action || (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 transition-all duration-200"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
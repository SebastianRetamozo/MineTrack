import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/helpers';
import { getProgressClass } from '../../utils/helpers';

type ProgressVariant = 'success' | 'warning' | 'danger' | 'auto';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, showLabel = false, variant = 'auto', size = 'md', children, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn('progress-bar', sizeClasses[size])}>
          <div
            className={cn('progress-bar-fill', getProgressClass(percentage))}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between text-xs text-navy-500 mt-1">
            <span>{Math.round(percentage)}%</span>
            {children && <span>{children}</span>}
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
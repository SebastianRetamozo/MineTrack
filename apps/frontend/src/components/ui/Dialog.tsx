import { Fragment, HTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: DialogProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Fragment>
      <div
        className="dialog-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
      >
        <div
          className={cn('dialog', maxWidthClasses[maxWidth])}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="dialog-header">
              {title && (
                <h2 id="dialog-title" className="dialog-title">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-description" className="mt-1 text-sm text-navy-500">
                  {description}
                </p>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 text-navy-400 hover:text-navy-600 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="dialog-content">
            {children}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = (props: DialogFooterProps) => {
  return (
    <div className="dialog-footer" {...props} />
  );
};
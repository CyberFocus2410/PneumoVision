import React from 'react';

/**
 * Card Component - Reusable container adhering to PneumoVision design tokens.
 * Supports light patient/clinical themes, dark PACS viewer styling, and alert states.
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  hover = false,
  title,
  subtitle,
  headerIcon: HeaderIcon,
  headerRight,
  className = '',
  ...props
}) {
  const variantStyles = {
    // Light / Patient-facing surfaces
    default: 'bg-surface-card border border-border-grid text-text-primary shadow-sm',
    nested: 'bg-surface-nested border border-border-grid/70 text-text-primary',
    bright: 'bg-surface-bright border border-border-grid text-text-primary shadow-sm',
    
    // PACS / Radiologist dark viewport surfaces
    pacs: 'bg-dicom-surface border border-dicom-border text-dicom-text-primary shadow-sm',
    'pacs-canvas': 'bg-dicom-canvas border border-dicom-border text-dicom-text-primary',

    // Clinical Alert & Integrity States
    tamper: 'bg-alert-tamper-bg border border-alert-tamper-border text-text-primary shadow-sm relative overflow-hidden',
    caution: 'bg-status-caution-bg border border-status-caution-border text-text-primary shadow-sm',
    verified: 'bg-status-verified-bg border border-status-verified-border text-text-primary shadow-sm',
  };

  const paddingStyles = {
    none: 'p-0',
    xs: 'p-space-xs',
    sm: 'p-space-sm',
    md: 'p-space-md',
    lg: 'p-space-lg',
    xl: 'p-space-xl',
  };

  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  };

  const hoverStyle = hover
    ? 'transition-all duration-150 hover:shadow-md hover:border-border-strong cursor-pointer'
    : '';

  const hasHeader = title || subtitle || HeaderIcon || headerRight;

  return (
    <div
      className={`
        ${variantStyles[variant] || variantStyles.default}
        ${paddingStyles[padding] || paddingStyles.md}
        ${roundedStyles[rounded] || roundedStyles.lg}
        ${hoverStyle}
        ${className}
      `.trim()}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-space-sm pb-space-sm mb-space-sm border-b border-border-grid/60">
          <div className="flex items-center gap-space-sm">
            {HeaderIcon && (
              <div className="shrink-0 text-secondary">
                <HeaderIcon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-headline-sm text-headline-sm tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;

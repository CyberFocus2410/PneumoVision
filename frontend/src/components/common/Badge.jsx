import React from 'react';

/**
 * Badge Component
 * Micro-metadata tag for accession codes, clinical modalities, model tags, and event types.
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
}) {
  const variantClasses = {
    default: 'bg-surface-nested text-text-secondary border border-border-grid',
    primary: 'bg-primary text-on-primary font-medium',
    secondary: 'bg-secondary/10 text-secondary border border-secondary/30 font-medium',
    dark: 'bg-primary-container text-on-primary-container border border-dicom-border font-mono',
    verified: 'bg-status-verified-bg text-status-verified border border-status-verified-border font-medium',
    caution: 'bg-status-caution-bg text-status-caution border border-status-caution-border font-medium',
    tamper: 'bg-alert-tamper-bg text-alert-tamper border border-alert-tamper-border font-medium',
    outline: 'bg-transparent text-text-primary border border-border-strong',
  };

  const sizeClasses = {
    sm: 'text-label-sm font-label-sm px-1.5 py-0.5 gap-1',
    md: 'text-label-md font-label-md px-2 py-0.5 gap-1.5',
    lg: 'text-[12px] font-label-lg px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded select-none font-semibold tracking-wide
        ${variantClasses[variant] || variantClasses.default}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `.trim()}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;

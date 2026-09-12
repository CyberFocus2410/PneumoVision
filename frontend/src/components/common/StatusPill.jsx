import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Clock, Info, ShieldX } from 'lucide-react';

/**
 * StatusPill Component
 * Clinical status indicator with semantic color tokens, pulse indicator, and icons.
 * Statuses: verified, caution, tamper, revoked, pending, info.
 */
export function StatusPill({
  status = 'verified',
  label,
  pulse = true,
  showDot = true,
  showIcon = false,
  size = 'md',
  className = '',
}) {
  const normalizedStatus = status.toLowerCase();

  const configs = {
    verified: {
      defaultLabel: 'VERIFIED',
      bgClass: 'bg-status-verified-bg text-status-verified border-status-verified-border',
      dotClass: 'bg-status-verified',
      icon: CheckCircle2,
    },
    caution: {
      defaultLabel: 'CAUTION',
      bgClass: 'bg-status-caution-bg text-status-caution border-status-caution-border',
      dotClass: 'bg-status-caution',
      icon: AlertTriangle,
    },
    tamper: {
      defaultLabel: 'TAMPER DETECTED',
      bgClass: 'bg-alert-tamper-bg text-alert-tamper border-alert-tamper-border',
      dotClass: 'bg-alert-tamper',
      icon: ShieldAlert,
    },
    revoked: {
      defaultLabel: 'REVOKED',
      bgClass: 'bg-alert-tamper-bg text-status-revoked border-alert-tamper-border',
      dotClass: 'bg-status-revoked',
      icon: ShieldX,
    },
    pending: {
      defaultLabel: 'PENDING',
      bgClass: 'bg-status-pending-bg text-status-pending border-status-pending-border',
      dotClass: 'bg-status-pending',
      icon: Clock,
    },
    info: {
      defaultLabel: 'ACTIVE',
      bgClass: 'bg-surface-nested text-secondary border-border-grid',
      dotClass: 'bg-secondary',
      icon: Info,
    },
  };

  const currentConfig = configs[normalizedStatus] || configs.verified;
  const displayLabel = label || currentConfig.defaultLabel;
  const IconComponent = currentConfig.icon;

  const sizeClasses = {
    sm: 'text-label-sm font-label-sm px-1.5 py-0.5 gap-1',
    md: 'text-label-md font-label-md px-2 py-1 gap-1.5',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded border font-semibold tracking-wide uppercase select-none
        ${currentConfig.bgClass}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `.trim()}
    >
      {showDot && (
        <span className="relative flex items-center justify-center shrink-0">
          {pulse && (
            <span
              className={`
                animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                ${currentConfig.dotClass}
              `}
            />
          )}
          <span
            className={`
              relative inline-flex rounded-full
              ${dotSizes[size] || dotSizes.md}
              ${currentConfig.dotClass}
            `}
          />
        </span>
      )}

      {showIcon && IconComponent && (
        <IconComponent className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      )}

      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusPill;

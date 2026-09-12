import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

/**
 * MonoHash Component
 * Monospace representation for on-chain transaction hashes, patient IDs, and content hashes.
 * Features customizable truncation, one-click clipboard copying, and optional block explorer links.
 */
export function MonoHash({
  hash = '',
  label,
  truncate = true,
  leadLength = 6,
  tailLength = 4,
  copyable = true,
  explorerUrl,
  theme = 'light',
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return <span className="font-code-hash text-code-hash text-text-muted">—</span>;
  }

  const rawHash = String(hash);

  const formattedDisplay = () => {
    if (!truncate || rawHash.length <= leadLength + tailLength + 3) {
      return rawHash;
    }
    return `${rawHash.slice(0, leadLength)}...${rawHash.slice(-tailLength)}`;
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rawHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const themeClasses = {
    light: {
      text: 'text-text-primary',
      muted: 'text-text-muted',
      secondary: 'text-text-secondary',
      btn: 'hover:text-text-primary hover:bg-border-grid/50 text-text-muted',
      badge: 'bg-surface-nested border border-border-grid',
    },
    pacs: {
      text: 'text-dicom-text-primary',
      muted: 'text-dicom-text-secondary',
      secondary: 'text-secondary-fixed-dim',
      btn: 'hover:text-dicom-text-primary hover:bg-dicom-border text-dicom-text-secondary',
      badge: 'bg-dicom-canvas border border-dicom-border',
    },
    verified: {
      text: 'text-status-verified font-medium',
      muted: 'text-status-verified/70',
      secondary: 'text-status-verified',
      btn: 'hover:text-status-verified hover:bg-status-verified-bg text-status-verified/70',
      badge: 'bg-status-verified-bg border border-status-verified-border',
    },
    tamper: {
      text: 'text-alert-tamper font-medium',
      muted: 'text-alert-tamper/70',
      secondary: 'text-alert-tamper',
      btn: 'hover:text-alert-tamper hover:bg-alert-tamper-bg text-alert-tamper/70',
      badge: 'bg-alert-tamper-bg border border-alert-tamper-border',
    },
  };

  const currentTheme = themeClasses[theme] || themeClasses.light;

  const sizeClasses = {
    sm: 'text-label-sm font-label-sm py-0.5 px-1.5',
    md: 'text-code-hash font-code-hash py-1 px-2',
    lg: 'text-[13px] font-mono py-1 px-2.5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded font-code-hash
        ${currentTheme.badge}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `.trim()}
      title={rawHash}
    >
      {label && (
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${currentTheme.muted}`}>
          {label}
        </span>
      )}

      <span className={`select-all tracking-tight font-mono ${currentTheme.text}`}>
        {formattedDisplay()}
      </span>

      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className={`p-0.5 rounded transition-colors ${currentTheme.btn}`}
          title={copied ? 'Copied to clipboard' : 'Copy full hash'}
          aria-label="Copy hash to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-status-verified animate-in fade-in" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-0.5 rounded transition-colors ${currentTheme.btn}`}
          title="Open in Block Explorer"
          aria-label="Open in Block Explorer"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </span>
  );
}

export default MonoHash;

import React from 'react';

export default function Footer() {
  return (
    <footer className="h-8 w-full bg-surface-card border-t border-border-grid px-space-md flex items-center justify-between font-label-sm text-label-sm text-text-muted select-none">
      <div className="flex items-center gap-space-md">
        <span>PneumoVision Diagnostic Engine v1.0.2</span>
        <span>EHR Ledger Block: #1,849,203</span>
        <span className="text-status-verified font-medium">Consensus: Validated (MST Testnet)</span>
      </div>
      <div className="flex items-center gap-space-md">
        <span>Cryptographic Content Anchor: SHA-256 On-Chain</span>
        <span>Session Token Valid (Bay 3)</span>
      </div>
    </footer>
  );
}

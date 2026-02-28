import { useEffect, useRef } from 'react';
import { useAppSelector } from '../shared/redux/store';

const STORAGE_KEY = 'app_version';
// Separate key to track whether we've already shown/handled a version in this session
const SESSION_KEY = 'app_version_session';

// ─── Style injection (once) ──────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('vg-styles')) return;
  const style = document.createElement('style');
  style.id = 'vg-styles';
  style.textContent = `
    @keyframes vg-slide-up {
      from { transform: translateY(100%) translateX(-50%); opacity: 0; }
      to   { transform: translateY(0)    translateX(-50%); opacity: 1; }
    }
    @keyframes vg-slide-down {
      from { transform: translateY(0)    translateX(-50%); opacity: 1; }
      to   { transform: translateY(130%) translateX(-50%); opacity: 0; }
    }
    @keyframes vg-pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(99,211,160,0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(99,211,160,0);  }
      100% { box-shadow: 0 0 0 0 rgba(99,211,160,0);    }
    }
    @keyframes vg-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes vg-progress {
      from { width: 100%; }
      to   { width: 0%;   }
    }
    @keyframes vg-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }

    #vg-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(130%);
      z-index: 99999;
      font-family: 'DM Sans', system-ui, sans-serif;
      min-width: 340px;
      max-width: 420px;
      width: max-content;
      pointer-events: all;
    }
    #vg-toast.vg-show {
      animation: vg-slide-up 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    #vg-toast.vg-hide {
      animation: vg-slide-down 0.35s cubic-bezier(0.4,0,1,1) forwards;
    }
    .vg-card {
      background: #0f1117;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 18px 20px;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.4),
        0 24px 48px rgba(0,0,0,0.5),
        0 8px 16px rgba(0,0,0,0.3),
        inset 0 1px 0 rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      overflow: hidden;
      position: relative;
    }
    .vg-card::before {
      content: '';
      position: absolute;
      top: 0; left: 20%; right: 20%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(99,211,160,0.6), transparent);
    }
    .vg-card.force::before {
      background: linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent);
    }
    .vg-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .vg-icon-wrap {
      flex-shrink: 0;
      width: 40px; height: 40px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .vg-icon-wrap.soft {
      background: rgba(99,211,160,0.12);
      border: 1px solid rgba(99,211,160,0.2);
      animation: vg-pulse-ring 2s ease-out infinite;
    }
    .vg-icon-wrap.force {
      background: rgba(251,191,36,0.12);
      border: 1px solid rgba(251,191,36,0.2);
    }
    .vg-text { flex: 1; min-width: 0; }
    .vg-title {
      color: #f1f5f9; font-size: 14px; font-weight: 600;
      line-height: 1.3; margin: 0 0 3px; letter-spacing: -0.1px;
    }
    .vg-sub {
      color: #64748b; font-size: 12px; margin: 0; line-height: 1.4;
    }
    .vg-version-pill {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 2px 8px;
      font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 5px;
      font-variant-numeric: tabular-nums;
    }
    .vg-version-pill .arrow { color: #475569; }
    .vg-version-pill .vg-new { color: #63d3a0; font-weight: 600; }
    .vg-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .vg-btn-refresh {
      display: flex; align-items: center; gap: 6px;
      background: #63d3a0; color: #0a1a12;
      border: none; border-radius: 10px; padding: 8px 16px;
      font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
      box-shadow: 0 2px 12px rgba(99,211,160,0.35);
      white-space: nowrap;
    }
    .vg-btn-refresh:hover {
      background: #7dddb0; transform: translateY(-1px);
      box-shadow: 0 4px 18px rgba(99,211,160,0.45);
    }
    .vg-btn-refresh:active { transform: translateY(0); }
    .vg-btn-refresh:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .vg-spinner {
      width: 13px; height: 13px;
      border: 2px solid rgba(10,26,18,0.3);
      border-top-color: #0a1a12;
      border-radius: 50%;
      animation: vg-spin 0.7s linear infinite;
      display: none;
    }
    .vg-btn-refresh.loading .vg-spinner  { display: block; }
    .vg-btn-refresh.loading .vg-btn-label { display: none; }
    .vg-btn-dismiss {
      width: 32px; height: 32px; border-radius: 8px;
      background: transparent; border: 1px solid rgba(255,255,255,0.08);
      color: #475569; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      font-family: inherit;
    }
    .vg-btn-dismiss:hover {
      background: rgba(255,255,255,0.06); color: #94a3b8;
      border-color: rgba(255,255,255,0.15);
    }
    .vg-progress-wrap {
      margin-top: 14px;
      background: rgba(255,255,255,0.05);
      border-radius: 99px; height: 3px; overflow: hidden;
    }
    .vg-progress-bar {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
      background-size: 200% auto;
      animation: vg-progress 3s linear forwards, vg-shimmer 1.5s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

function createToast(
  oldVersion: string,
  newVersion: string,
  forceRefresh: boolean,
  onRefresh: () => void,
) {
  injectStyles();
  if (document.getElementById('vg-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'vg-toast';

  if (forceRefresh) {
    toast.innerHTML = `
      <div class="vg-card force">
        <div class="vg-row">
          <div class="vg-icon-wrap force">⚡</div>
          <div class="vg-text">
            <p class="vg-title">Applying update automatically</p>
            <p class="vg-sub">Your app will refresh in a moment</p>
            <span class="vg-version-pill">
              ${oldVersion} <span class="arrow">→</span>
              <span class="vg-new">${newVersion}</span>
            </span>
          </div>
        </div>
        <div class="vg-progress-wrap">
          <div class="vg-progress-bar"></div>
        </div>
      </div>
    `;
  } else {
    toast.innerHTML = `
      <div class="vg-card">
        <div class="vg-row">
          <div class="vg-icon-wrap soft">✦</div>
          <div class="vg-text">
            <p class="vg-title">Update available</p>
            <p class="vg-sub">Refresh to get the latest version</p>
            <span class="vg-version-pill">
              ${oldVersion} <span class="arrow">→</span>
              <span class="vg-new">${newVersion}</span>
            </span>
          </div>
          <div class="vg-actions">
            <button class="vg-btn-refresh" id="vg-refresh-btn">
              <span class="vg-btn-label">Refresh</span>
              <div class="vg-spinner"></div>
            </button>
            <button class="vg-btn-dismiss" id="vg-dismiss-btn" title="Dismiss">✕</button>
          </div>
        </div>
      </div>
    `;
  }

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('vg-show'));

  if (!forceRefresh) {
    document.getElementById('vg-refresh-btn')?.addEventListener('click', () => {
      const btn = document.getElementById('vg-refresh-btn') as HTMLButtonElement;
      if (btn) { btn.classList.add('loading'); btn.disabled = true; }
      onRefresh();
    });
    document.getElementById('vg-dismiss-btn')?.addEventListener('click', () => {
      toast.classList.remove('vg-show');
      toast.classList.add('vg-hide');
      setTimeout(() => toast.remove(), 400);
    });
  }
}

function dismissToast() {
  const toast = document.getElementById('vg-toast');
  if (!toast) return;
  toast.classList.remove('vg-show');
  toast.classList.add('vg-hide');
  setTimeout(() => toast.remove(), 400);
}

async function clearCacheAndReload(newVersion: string) {
  if ('caches' in globalThis) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  localStorage.setItem(STORAGE_KEY, newVersion);
  // Clear session key so fresh session starts clean after reload
  sessionStorage.removeItem(SESSION_KEY);
  globalThis.location.reload();
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVersionGuard() {
  const { partner_version: version, force_refresh } = useAppSelector((state) => state.brand) ?? {};

  // Guards against React StrictMode double-fire and multiple Redux re-renders
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    // ── Guard 1: Wait for Redux to hydrate ──
    if (!version) return;

    // ── Guard 2: Normalize — trim whitespace, cast to string ──
    // Prevents spurious triggers from " 1.0.0" vs "1.0.0" or number vs string
    const incoming = String(version).trim();
    if (!incoming) return;

    // ── Guard 3: Already handled this exact version+force combo this session ──
    // Uses a compound key so toggling force_refresh on same version doesn't re-trigger
    const handledKey = `${incoming}:${force_refresh}`;
    if (handledRef.current === handledKey) return;

    // ── Guard 4: Check sessionStorage — survives React StrictMode remounts ──
    // but is cleared on true page reload (unlike localStorage)
    const sessionHandled = sessionStorage.getItem(SESSION_KEY);
    if (sessionHandled === handledKey) {
      handledRef.current = handledKey;
      return;
    }

    const storedVersion = localStorage.getItem(STORAGE_KEY);

    // ── First ever visit: nothing in localStorage ──
    if (!storedVersion) {
      localStorage.setItem(STORAGE_KEY, incoming);
      handledRef.current = handledKey;
      sessionStorage.setItem(SESSION_KEY, handledKey);
      return;
    }

    // ── No version change: just sync the handled refs and exit ──
    if (incoming === storedVersion) {
      handledRef.current = handledKey;
      sessionStorage.setItem(SESSION_KEY, handledKey);
      // If a stale toast is somehow still showing, remove it
      dismissToast();
      return;
    }

    // ── Version has changed ──
    // Mark as handled BEFORE any async work to prevent duplicate triggers
    handledRef.current = handledKey;
    // sessionStorage.setItem(SESSION_KEY, handledKey);

    if (force_refresh) {
      createToast(storedVersion, incoming, true, () => clearCacheAndReload(incoming));
      setTimeout(() => clearCacheAndReload(incoming), 3000);
    } else {
      // Soft update — store new version immediately so re-renders don't re-trigger
    //   localStorage.setItem(STORAGE_KEY, incoming);
      createToast(storedVersion, incoming, false, () => clearCacheAndReload(incoming));
    }
  }, [version, force_refresh]);
}
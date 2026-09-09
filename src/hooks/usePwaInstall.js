import { useState, useSyncExternalStore } from 'react';

let deferredPrompt = null;
let installed = false;
let snapshot = { deferredPrompt: null, installed: false, rev: 0 };
const listeners = new Set();

function emit() {
  snapshot = {
    deferredPrompt,
    installed,
    rev: snapshot.rev + 1,
  };
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return snapshot;
}

const serverSnapshot = { deferredPrompt: null, installed: false, rev: 0 };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (standalone) {
    installed = true;
    emit();
  }
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  const [hintOpen, setHintOpen] = useState(false);

  async function install() {
    if (state.installed) return { ok: true, already: true };

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      emit();
      return { ok: choice?.outcome === 'accepted', via: 'prompt' };
    }

    setHintOpen(true);
    return { ok: false, via: 'hint' };
  }

  return {
    canPrompt: Boolean(state.deferredPrompt),
    installed: state.installed,
    isIos: isIosDevice(),
    hintOpen,
    setHintOpen,
    install,
  };
}

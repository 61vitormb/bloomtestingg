/**
 * Reprodutor da identidade sonora (Web Audio). O contexto de áudio só é criado
 * na primeira ação da usuária — nunca ao abrir o app.
 */
import { useCallback } from "react";
import { notesFor, type SoundEvent } from "@/domain/sound";
import { readDeviceSettings } from "./device-settings";

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playSound(
  event: SoundEvent,
  override?: { enabled: boolean; volume: number },
): void {
  const notes = notesFor(event, override ?? readDeviceSettings().sound);
  if (notes.length === 0) return;
  const ac = audioContext();
  if (!ac) return;
  const start = ac.currentTime + 0.01;
  for (const note of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = note.type;
    osc.frequency.value = note.freq;
    const t0 = start + note.at;
    // envelope suave: ataque curto e decaimento exponencial (timbre de sino)
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(note.gain * 0.35, 0.0002), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.05);
  }
}

export function useSound() {
  return useCallback((event: SoundEvent) => playSound(event), []);
}

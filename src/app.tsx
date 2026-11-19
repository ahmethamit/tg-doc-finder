import { signal } from '@preact/signals';

// Phase 0 placeholder: a counter proves Preact + signals work on the phone.
const taps = signal(0);

export function App() {
  return (
    <main>
      <h1>TG Doc Finder</h1>
      <p>Faz 0 — iskelet çalışıyor.</p>
      <button onClick={() => taps.value++}>Dokunma testi: {taps}</button>
    </main>
  );
}

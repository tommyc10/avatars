import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BotAvatar, type BotAvatarState, type BotAvatarType } from '../src';

/* ?still pins every avatar to its rest pose, for screenshots */
const still = new URLSearchParams(location.search).has('still');

const row: BotAvatarType[] = ['clover', 'flower', 'star', 'ghost', 'mech', 'dragon', 'circle', 'hexagon', 'square'];
const states: BotAvatarState[] = ['default', 'working', 'sleeping'];
const accents = [
  { label: 'Pink phones', color: '#2FCB7A', accent: '#FF5FA2' },
  { label: 'Black phones', color: '#2FCB7A', accent: '#2A2D36' },
  { label: 'Purple dragon', color: '#9A62FF', accent: '#FFD32B' },
  { label: 'Red dragon', color: '#FF2A2A', accent: '#2A2D36' },
  { label: 'Blue dragon', color: '#35B8FF', accent: '#F4F2FA' },
];

function App() {
  return (
    <>
      <h2>Next to the library's shapes</h2>
      <div className="stage">
        {row.map((t) => (
          <div className="cell" key={t}>
            <BotAvatar type={t} size={52} paused={still} seed={0.3} />
            <span className="label">{t[0].toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>

      <h2>Big</h2>
      <div className="stage">
        <BotAvatar type="dragon" size={220} paused={still} seed={0.3} />
        <BotAvatar type="dragon" face="mouth" size={220} paused={still} seed={0.6} />
      </div>

      <h2>States</h2>
      <div className="stage">
        {states.map((s) => (
          <div className="cell" key={s}>
            <BotAvatar type="dragon" state={s} size={96} paused={still} />
            <span className="label">{s}</span>
          </div>
        ))}
      </div>

      <h2>Colours</h2>
      <div className="stage">
        {accents.map((a) => (
          <div className="cell" key={a.label}>
            <BotAvatar type="dragon" color={a.color} accent={a.accent} size={72} paused={still} />
            <span className="label">{a.label}</span>
          </div>
        ))}
      </div>

      <h2>On light</h2>
      <div className="stage light" data-theme="light">
        {[24, 36, 52, 72].map((s) => (
          <BotAvatar key={s} type="dragon" size={s} paused={still} />
        ))}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

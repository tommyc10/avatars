import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BotAvatar, botAvatarPresets, type BotAvatarState, type BotAvatarType } from '../src';

/* ?still pins every avatar to its rest pose, for screenshots */
const still = new URLSearchParams(location.search).has('still');

const row: BotAvatarType[] = ['clover', 'flower', 'star', 'ghost', 'mech', 'dragon', 'circle', 'hexagon', 'square'];
const states: BotAvatarState[] = ['default', 'working', 'sleeping'];
const fantasy: BotAvatarType[] = ['dragon', 'forest-spirit', 'winged-dragon', 'phoenix'];
const accents = [
  { label: 'Pink phones', color: '#2FCB7A', accent: '#FF5FA2' },
  { label: 'Black phones', color: '#2FCB7A', accent: '#2A2D36' },
  { label: 'Purple dragon', color: '#9A62FF', accent: '#FFD32B' },
  { label: 'Red dragon', color: '#FF2A2A', accent: '#2A2D36' },
  { label: 'Blue dragon', color: '#35B8FF', accent: '#F4F2FA' },
];

function App() {
  const [selected, setSelected] = useState<BotAvatarType>('dragon');
  const [state, setState] = useState<BotAvatarState>('default');
  const [headphones, setHeadphones] = useState(true);
  const [paused, setPaused] = useState(still);
  const [color, setColor] = useState(botAvatarPresets[selected].color);
  const [accent, setAccent] = useState(botAvatarPresets[selected].accent!);
  const [headphoneColor, setHeadphoneColor] = useState('#FF5FA2');
  const choose = (type: BotAvatarType) => {
    setSelected(type);
    setColor(botAvatarPresets[type].color);
    setAccent(botAvatarPresets[type].accent!);
    setHeadphones(botAvatarPresets[type].headphones ?? false);
  };
  return (
    <>
      <header><p className="eyebrow">Our avatar collection</p><h1>Mythical little companions.</h1><p className="intro">Your three picks and a flying headphone dragon. Click to hop; move nearby to catch their eye.</p></header>
      <section className="fantasy-grid" aria-label="Fantasy avatars">
        {fantasy.map(t => <button key={t} className={`fantasy-card ${selected === t ? 'selected' : ''}`} onClick={() => choose(t)} aria-pressed={selected === t}>
          <BotAvatar type={t} size="clamp(64px, 10vw, 110px)" paused={paused} seed={0.3} interactive={false} />
          <span>{botAvatarPresets[t].label}</span>
        </button>)}
      </section>
      <section className="workbench" aria-label="Avatar playground">
        <div className="preview"><BotAvatar key={`${selected}:${paused ? state : 'live'}`} type={selected} state={state} size={190} color={color} accent={accent} headphones={headphones} headphoneColor={headphoneColor} paused={paused} seed={0.3} data-testid="playground-avatar" /></div>
        <div className="controls">
          <h2>{botAvatarPresets[selected].label}</h2>
          <div className="state-buttons" aria-label="Animation state">{states.map(s => <button key={s} onClick={() => setState(s)} aria-pressed={state === s}>{s === 'default' ? 'Idle' : s[0].toUpperCase() + s.slice(1)}</button>)}</div>
          <label className="toggle"><input type="checkbox" checked={headphones} onChange={e => setHeadphones(e.target.checked)} /> Headphones</label>
          <label className="toggle"><input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} /> Pause animation</label>
          <div className="color-controls"><label>Body<input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>{selected !== 'dragon' && <label>Details<input type="color" value={accent} onChange={e => setAccent(e.target.value)} /></label>}<label>Headphones<input type="color" value={headphoneColor} onChange={e => setHeadphoneColor(e.target.value)} /></label></div>
          <code>{`<BotAvatar type="${selected}" state="${state}"${headphones ? ' headphones' : ''} />`}</code>
        </div>
      </section>
      <h2 className="section-title">All three states</h2>
      <div className="state-grid">{fantasy.map(t => <section className="state-card" key={t}><h3>{botAvatarPresets[t].label}</h3><div className="state-row">{states.map(s => <div className="cell" key={s}><BotAvatar type={t} state={s} size={68} paused={paused} /><span className="label">{s === 'default' ? 'idle' : s}</span></div>)}</div></section>)}</div>
      <h2 className="section-title">Small sizes · light surface</h2>
      <div className="stage light" data-theme="light">{fantasy.map(t => <div className="cell" key={t}><div className="size-row">{[24, 36, 52, 72].map(s => <BotAvatar type={t} key={s} size={s} paused={paused} />)}</div><span className="label">{botAvatarPresets[t].label}</span></div>)}</div>

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

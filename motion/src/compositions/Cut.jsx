// Merakit adegan menurut timeline (src/timeline.js) — dipakai semua varian.
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from 'remotion';
import { StarIris } from '../components/Ornaments.jsx';
import { ease, prog } from '../lib/motion.js';
import { S6Quran, S7Sholat, S8Kiblat, S9Panels } from '../scenes/Features.jsx';
import { S10Proof, S11Finale } from '../scenes/Finale.jsx';
import { RDoa, RHadits, RHome, RKalender, RNyaman, RQuran, RSholat, RZakat, S11QR } from '../scenes/Reel.jsx';
import { S5Montage } from '../scenes/Montage.jsx';
import { S1Genesis, S2Lattice, S3RosetteArch, S4Logo } from '../scenes/Opening.jsx';
import { VARIANTS } from '../timeline.js';

const SCENES = {
  S1: S1Genesis,
  S2: S2Lattice,
  S3: S3RosetteArch,
  S4: S4Logo,
  S5: S5Montage,
  S6: S6Quran,
  S7: S7Sholat,
  S8: S8Kiblat,
  S9: S9Panels,
  S10: S10Proof,
  S11: S11Finale,
  // khusus reel 90 dtk
  RHome,
  RQuran,
  RSholat,
  RDoa,
  RHadits,
  RKalender,
  RZakat,
  RNyaman,
  S11QR,
};
const TRANSITION = 22;

function SceneAt({ seg }) {
  const Scene = SCENES[seg.scene];
  const offset = seg.offset ?? 0;
  return offset ? (
    <Sequence from={-offset} layout="none">
      <Scene {...seg.props} />
    </Sequence>
  ) : (
    <Scene {...seg.props} />
  );
}

function IrisIn({ children }) {
  const frame = useCurrentFrame();
  return <StarIris progress={prog(frame, 0, TRANSITION, ease.glide)}>{children}</StarIris>;
}

/** Celup ke hitam di sekitar batas adegan (±20 frame). */
function Dip({ at }) {
  const frame = useCurrentFrame();
  const d = frame < at ? prog(frame, at - 20, at, ease.glide) : 1 - prog(frame, at, at + 22, ease.silk);
  return <AbsoluteFill style={{ background: '#000', opacity: d, pointerEvents: 'none' }} />;
}

export function Cut({ variant }) {
  const { segments } = VARIANTS[variant];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {segments.map((seg, i) => {
        const prev = segments[i - 1];
        return (
          <Sequence key={`${seg.scene}-${seg.from}`} from={seg.from} durationInFrames={seg.dur} name={seg.scene}>
            {seg.enter === 'iris' && prev && (
              <Sequence durationInFrames={TRANSITION} layout="none">
                <Freeze frame={(prev.offset ?? 0) + prev.dur - 1}>
                  <SceneAt seg={{ ...prev, offset: 0 }} />
                </Freeze>
              </Sequence>
            )}
            {seg.enter === 'iris' ? (
              <IrisIn>
                <SceneAt seg={seg} />
              </IrisIn>
            ) : (
              <SceneAt seg={seg} />
            )}
          </Sequence>
        );
      })}
      {segments
        .filter((s) => s.enter === 'dip')
        .map((s) => (
          <Dip key={`dip-${s.from}`} at={s.from} />
        ))}
    </AbsoluteFill>
  );
}

import { Composition, Still } from 'remotion';
import { Cut } from './compositions/Cut.jsx';
import { HERO_LOOP_FRAMES, HeroLoop } from './compositions/HeroLoop.jsx';
import { ReelCover } from './compositions/ReelCover.jsx';
import { VARIANTS } from './timeline.js';

export function RemotionRoot() {
  return (
    <>
      {Object.entries(VARIANTS).map(([key, v]) => (
        <Composition key={key} id={v.id} component={Cut} defaultProps={{ variant: key }} durationInFrames={v.durationInFrames} fps={60} width={v.width} height={v.height} />
      ))}
      <Composition id="IMuslimHeroLoop" component={HeroLoop} durationInFrames={HERO_LOOP_FRAMES} fps={60} width={1920} height={1080} />
      <Still id="IMuslimReelCover" component={ReelCover} width={1080} height={1920} />
    </>
  );
}

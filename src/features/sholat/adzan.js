const BASE = import.meta.env.BASE_URL;

// Audio adzan dari iMuslim versi sebelumnya (dipindah dari myassets/audio ke public/audio).
export const ADZAN_AUDIO = {
  subuh: `${BASE}audio/adzan-subuh.mp3`,
  imsak: `${BASE}audio/imsak.mp3`,
  default: `${BASE}audio/adzan.mp3`,
};

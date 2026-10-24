import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useBrowser.js';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="global-banner global-banner--offline" role="status">
      <WifiOff aria-hidden="true" width={18} height={18} />
      Anda sedang offline. Data yang pernah dimuat tetap bisa dibuka dan akan ditandai bila mungkin sudah usang.
    </div>
  );
}

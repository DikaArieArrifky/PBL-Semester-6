import { useGateStatus } from '../../../hooks/useGateStatus';

export interface GateNotificationState {
  trainPresent: boolean;
  gateState: string | null;
  message: string;
}

export default function NotifikasiKereta({ crossId }: { crossId: string | null }) {
  const { gateState, loading } = useGateStatus(crossId);

  const trainPresent = gateState === 'CLOSED' || gateState === 'CLOSING' || gateState === 'WAITING';

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-slate-800 animate-pulse">
        <div className="h-5 w-40 bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-xl text-white text-lg font-semibold transition-all duration-300 ${
        trainPresent ? 'bg-red-500' : 'bg-green-600'
      }`}
    >
      {trainPresent ? 'Kereta sedang lewat' : 'Tidak ada kereta lewat'}
    </div>
  );
}

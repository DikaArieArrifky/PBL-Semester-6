import { useCallback, useMemo } from "react";
import { useDevicesData } from "./useDevicesData";

type DevicesSummary = {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
};

export function useDevicesViewModel() {
  const { loading, error, crossings, devices, selectedCrossId, setSelectedCrossId, refresh } = useDevicesData();

  const summary: DevicesSummary = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((device) => (device.status ?? "").toLowerCase() === "online").length;
    const offline = devices.filter((device) => (device.status ?? "").toLowerCase() === "offline").length;
    const maintenance = devices.filter((device) => (device.status ?? "").toLowerCase() === "maintenance").length;

    return { total, online, offline, maintenance };
  }, [devices]);

  const crossingNameById = useMemo(() => {
    return new Map(crossings.map((crossing) => [crossing.cross_id, crossing.name]));
  }, [crossings]);

  const selectedCrossingLabel = useMemo(() => {
    if (!selectedCrossId) return "All crossings";
    return crossingNameById.get(selectedCrossId) ?? selectedCrossId;
  }, [crossingNameById, selectedCrossId]);

  const getCrossingLabel = useCallback(
    (crossId: string | null) => {
      if (!crossId) return "Unassigned";
      return crossingNameById.get(crossId) ?? crossId;
    },
    [crossingNameById]
  );

  return {
    loading,
    error,
    crossings,
    devices,
    selectedCrossId,
    setSelectedCrossId,
    refresh,
    summary,
    selectedCrossingLabel,
    getCrossingLabel,
  };
}

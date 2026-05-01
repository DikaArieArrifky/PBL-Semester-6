import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { CrossingRow, DeviceRow } from "../types/dashboard";

type DevicesHookData = {
	loading: boolean;
	error: string | null;
	crossings: CrossingRow[];
	devices: DeviceRow[];
	selectedCrossId: string;
	setSelectedCrossId: (value: string) => void;
	refresh: () => Promise<void>;
};

export function useDevicesData(): DevicesHookData {
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [crossings, setCrossings] = useState<CrossingRow[]>([]);
	const [devices, setDevices] = useState<DeviceRow[]>([]);
	const [selectedCrossId, setSelectedCrossId] = useState<string>("");

	const fetchCrossings = useCallback(async () => {
		const { data, error: crossingsError } = await supabase
			.from("crossings")
			.select("cross_id, name, status")
			.order("name", { ascending: true });

		if (crossingsError) {
			setError(crossingsError.message);
			setCrossings([]);
			return;
		}

		setCrossings(data ?? []);
	}, []);

	const fetchDevices = useCallback(async (crossId: string, silent = false) => {
		if (!silent) setLoading(true);

		let devicesQuery = supabase
			.from("devices")
			.select(
				"device_id, cross_id, type, model, firmware_version, mac_address, mqtt_client_id, status, last_seen_at, registered_at"
			)
			.order("registered_at", { ascending: false });

		if (crossId) {
			devicesQuery = devicesQuery.eq("cross_id", crossId);
		}

		const { data, error: devicesError } = await devicesQuery;

		if (devicesError) {
			setError(devicesError.message);
			setDevices([]);
		} else {
			setError(null);
			setDevices(data ?? []);
		}

		if (!silent) setLoading(false);
	}, []);

	const refresh = useCallback(async () => {
		await fetchDevices(selectedCrossId, false);
	}, [fetchDevices, selectedCrossId]);

	useEffect(() => {
		const bootstrap = async () => {
			await fetchCrossings();
			await fetchDevices(selectedCrossId, false);
		};

		bootstrap();
	}, [fetchCrossings, fetchDevices, selectedCrossId]);

	useEffect(() => {
		const realtimeFilter = selectedCrossId ? `cross_id=eq.${selectedCrossId}` : undefined;

		const channel = supabase
			.channel(`devices-live-${selectedCrossId || "all"}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "devices", filter: realtimeFilter }, () => {
				fetchDevices(selectedCrossId, true);
			})
			.on("postgres_changes", { event: "*", schema: "public", table: "crossings" }, () => {
				fetchCrossings();
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [fetchCrossings, fetchDevices, selectedCrossId]);

	useEffect(() => {
		if (!selectedCrossId) return;
		const stillExists = crossings.some((crossing) => crossing.cross_id === selectedCrossId);
		if (!stillExists) {
			setSelectedCrossId("");
		}
	}, [crossings, selectedCrossId]);

	return {
		loading,
		error,
		crossings,
		devices,
		selectedCrossId,
		setSelectedCrossId,
		refresh,
	};
}

/**
 * useGymTime — formats dates using the gym's configured UTC offset (from Settings).
 * All displayed times across the app should use these helpers instead of toLocaleString().
 */
export function useGymTime() {
  const { data: settings } = useFetch("/api/settings");

  const offset = computed(() => settings.value?.utcOffset ?? 8);

  function gymDate(d) {
    if (!d) return "—";
    const shifted = new Date(new Date(d).getTime() + offset.value * 3600000);
    return shifted.toLocaleDateString("en-PH", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function gymTime(d) {
    if (!d) return "—";
    const shifted = new Date(new Date(d).getTime() + offset.value * 3600000);
    return shifted.toLocaleTimeString("en-PH", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function gymDateTime(d, opts = {}) {
    if (!d) return "—";
    const shifted = new Date(new Date(d).getTime() + offset.value * 3600000);
    return shifted.toLocaleString("en-PH", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...opts,
    });
  }

  function gymDateOnly(d) {
    if (!d) return "—";
    const shifted = new Date(new Date(d).getTime() + offset.value * 3600000);
    return shifted.toISOString().slice(0, 10);
  }

  return { gymDate, gymTime, gymDateTime, gymDateOnly, offset };
}

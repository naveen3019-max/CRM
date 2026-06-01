import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, LocateFixed, Loader2, MapPin, Search, X } from "lucide-react";
import { buildLocationMessageBody, buildLocationMapUrl, parseLocationPayload } from "./chatMessageUtils.js";

function normalizeSuggestion(entry) {
  const latitude = Number(entry?.lat);
  const longitude = Number(entry?.lon);
  const addressParts = [
    entry?.name,
    entry?.display_name,
    entry?.address?.road,
    entry?.address?.suburb,
    entry?.address?.city,
    entry?.address?.town,
    entry?.address?.state,
    entry?.address?.country
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  const formattedAddress = String(entry?.display_name || addressParts.join(", ")).trim();
  const label = String(entry?.name || addressParts[0] || formattedAddress).trim();

  return {
    label,
    address: formattedAddress,
    formattedAddress,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    mapUrl: buildLocationMapUrl(latitude, longitude, formattedAddress || label),
    staticMapUrl: Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=640x260&markers=${latitude},${longitude},red-pushpin`
      : ""
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export function LocationPicker({
  open,
  title = "Share location",
  subtitle = "Pick a GPS location, search an address, or confirm a map pin.",
  initialValue = null,
  onClose,
  onSelect,
  confirmLabel = "Use this location"
}) {
  const normalizedInitial = useMemo(
    () => parseLocationPayload(initialValue?.messageBody || initialValue?.originalMessage || initialValue?.message || initialValue, initialValue?.metadata || null),
    [initialValue]
  );
  const [query, setQuery] = useState(normalizedInitial?.formattedAddress || normalizedInitial?.label || "");
  const [results, setResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(normalizedInitial || null);
  const [searching, setSearching] = useState(false);
  const [fetchingCurrentLocation, setFetchingCurrentLocation] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedLocation(normalizedInitial || null);
    setQuery(normalizedInitial?.formattedAddress || normalizedInitial?.label || "");
    setResults([]);
    setError("");
  }, [open, normalizedInitial]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      setResults([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(trimmedQuery)}`;
        const nextResults = await fetchJson(url);
        setResults(Array.isArray(nextResults) ? nextResults.map(normalizeSuggestion).filter((item) => item.latitude !== null && item.longitude !== null) : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("This device cannot access GPS location.");
      return;
    }

    setFetchingCurrentLocation(true);
    setError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);

      let reverseLocation = null;
      try {
        const reverse = await fetchJson(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
        );
        reverseLocation = normalizeSuggestion(reverse);
      } catch {
        reverseLocation = null;
      }

      const nextLocation = reverseLocation || {
        label: "Current location",
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude,
        mapUrl: buildLocationMapUrl(latitude, longitude)
      };

      setSelectedLocation(nextLocation);
      setQuery(nextLocation.formattedAddress || nextLocation.label || "");
      setResults([]);
    } catch {
      setError("Unable to access GPS. Try searching for the address instead.");
    } finally {
      setFetchingCurrentLocation(false);
    }
  };

  const handleSelectSuggestion = (entry) => {
    setSelectedLocation(entry);
    setQuery(entry.formattedAddress || entry.label || "");
    setResults([]);
    setError("");
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      setError("Choose a location before continuing.");
      return;
    }

    onSelect?.({
      ...selectedLocation,
      messageBody: buildLocationMessageBody(selectedLocation)
    });
    onClose?.();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Location</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close location picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={fetchingCurrentLocation}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {fetchingCurrentLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                {fetchingCurrentLocation ? "Fetching GPS..." : "Use current location"}
              </button>

              <a
                href={selectedLocation?.mapUrl || buildLocationMapUrl(null, null, query)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Maps
              </a>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search address, landmark, city, or pincode"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </div>

            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {searching ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                  Searching locations...
                </div>
              ) : null}

              {!searching && query.trim().length >= 3 && !results.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                  No matching places found. Try a more specific landmark or postcode.
                </div>
              ) : null}

              {results.map((entry) => {
                const isSelected = selectedLocation && entry.latitude === selectedLocation.latitude && entry.longitude === selectedLocation.longitude;

                return (
                  <button
                    key={`${entry.latitude}-${entry.longitude}-${entry.label}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(entry)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-2 ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{entry.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{entry.formattedAddress}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {entry.latitude?.toFixed(5)}, {entry.longitude?.toFixed(5)}
                        </p>
                      </div>
                      {isSelected ? <Check className="mt-1 h-4 w-4 text-blue-600" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {selectedLocation?.staticMapUrl ? (
                <img
                  src={selectedLocation.staticMapUrl}
                  alt="Selected location map preview"
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] text-center">
                  <div>
                    <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">No location selected</p>
                    <p className="mt-1 text-xs text-slate-400">Search a place or use current GPS to preview it here.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Address preview</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selectedLocation?.formattedAddress || selectedLocation?.label || "No selection yet"}</p>
              </div>

              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Latitude</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedLocation?.latitude?.toFixed?.(6) || "--"}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Longitude</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedLocation?.longitude?.toFixed?.(6) || "--"}</p>
                </div>
              </div>

              <a
                href={selectedLocation?.mapUrl || buildLocationMapUrl(null, null, query)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open map route
              </a>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedLocation}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
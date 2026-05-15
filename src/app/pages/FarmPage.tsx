import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../api/queryKeys";
import { useToast } from "../components/ui/useToast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { RowActions } from "../components/ui/RowActions";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { LoadingState } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { farmStatusTone, farmStatusLabel } from "../utils/status";
import {
  Plus,
  MapPin,
  ChevronDown,
  ChevronUp,
  Home,
  Tractor,
  Globe,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";
import { api, FarmResponse, WeatherCurrentResponse } from "../../api/client";

// ─── Local Types ──────────────────────────────────────────────────────────

type FarmStatus = "Hoạt động" | "Không hoạt động";

interface Farm {
  id: string;
  name: string;
  location: string;
  status: FarmStatus;
  area: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

interface FarmFormData {
  name: string;
  location: string;
  status: FarmStatus;
  area: string;
  latitude?: number;
  longitude?: number;
}

interface FarmFormErrors {
  name?: string;
  location?: string;
  area?: string;
}

/**
 * Result returned by MapPickerModal via onSelect.
 * latitude/longitude are null when the user confirmed a text-only address
 * (typed address, no pin placed on the map).
 */
interface MapPickerResult {
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapFarm(f: FarmResponse): Farm {
  return {
    id: f.farmId,
    name: f.farmName ?? "",
    location: stripPlusCode(f.farmLocation ?? ""),
    status: f.farmStatus === "Active" ? "Hoạt động" : "Không hoạt động",
    area: f.farmArea ?? 0,
    createdAt: f.farmCreatedAt
      ? new Date(f.farmCreatedAt).toLocaleDateString("vi-VN")
      : "",
    latitude: toCoord(f.latitude) ?? undefined,
    longitude: toCoord(f.longitude) ?? undefined,
  };
}

function validateFarmForm(formData: {
  name: string;
  location: string;
  area: string;
}): FarmFormErrors {
  const errors: FarmFormErrors = {};
  if (!formData.name.trim()) {
    errors.name = "Vui lòng nhập tên trang trại";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Tên trang trại phải có ít nhất 2 ký tự";
  } else if (formData.name.trim().length > 255) {
    errors.name = "Tên trang trại không được quá 255 ký tự";
  }
  if (!formData.location.trim()) {
    errors.location = "Vui lòng nhập địa chỉ trang trại";
  } else if (formData.location.trim().length > 600) {
    errors.location = "Địa chỉ không được quá 600 ký tự";
  }
  if (!formData.area.trim()) {
    errors.area = "Vui lòng nhập diện tích";
  } else {
    const a = parseFloat(formData.area);
    if (isNaN(a) || a <= 0) {
      errors.area = "Diện tích phải là số dương";
    } else if (a > 10_000_000) {
      errors.area = "Diện tích vượt quá giới hạn cho phép";
    }
  }
  return errors;
}

const STATUS_OPTIONS: Array<{ value: FarmStatus; label: string }> = [
  { value: "Hoạt động", label: "Hoạt động" },
  { value: "Không hoạt động", label: "Không hoạt động" },
];

/**
 * Strip Google Plus Codes from a formatted address.
 * Plus Codes look like "XF9X+XH9, " at the start of the address.
 * We display the cleaned version — DB value is unchanged.
 */
function stripPlusCode(address: string): string {
  return address.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3},?\s*/i, "").trim();
}

function toCoord(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

function fmtCoord(v: number | string | null | undefined): string {
  const n = toCoord(v);
  return n != null ? n.toFixed(6) : "—";
}

// ─── Google Maps API loader ───────────────────────────────────────────────
//
// COST SAFEGUARDS:
//   1. Script loaded lazily — only when MapPickerModal first opens, not on
//      page load. Zero cost for users who never open the map picker.
//   2. Singleton promise — script loads exactly ONCE per browser session
//      regardless of how many times the modal opens/closes.
//   3. Places Autocomplete fires only after ≥2 chars + 300ms debounce.
//      One AutocompleteSessionToken is reused across all keystroke requests
//      then consumed by the single PlaceDetails call → billed as ONE session,
//      not per-keystroke.
//   4. NO Geocoding API calls in this file — address ↔ coords resolution
//      is entirely delegated to the backend (PUT /api/Maps/farm/{id}/coordinates).
//      Reverse geocode on map click is intentionally omitted.
//   5. PlaceDetails only requests the `geometry.location` field — lowest
//      billing tier (Basic Data), not Contact or Atmosphere.
//   6. Autocomplete restricted to Vietnam (componentRestrictions: {country:"vn"})
//      to reduce irrelevant results and re-queries.

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GMaps = typeof google.maps;

let _gmapsLoadPromise: Promise<GMaps> | null = null;

/**
 * Load the Google Maps JS API exactly once.
 * Returns the `google.maps` namespace.
 * Rejects with a human-readable message if the key is missing or the
 * script fails to load.
 */
function loadGoogleMaps(): Promise<GMaps> {
  if (_gmapsLoadPromise) return _gmapsLoadPromise;

  _gmapsLoadPromise = new Promise((resolve, reject) => {
    if (!GMAPS_API_KEY) {
      _gmapsLoadPromise = null;
      reject(
        new Error(
          "VITE_GOOGLE_MAPS_API_KEY chưa được cấu hình. Thêm vào file .env rồi khởi động lại.",
        ),
      );
      return;
    }

    // Already loaded by a previous call in this session
    if (typeof google !== "undefined" && google.maps) {
      resolve(google.maps);
      return;
    }

    const callbackName = `__gmaps_cb_${Date.now()}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = () => {
      resolve(google.maps);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
    };

    const script = document.createElement("script");
    // libraries=places  → Places Autocomplete + PlacesService
    // loading=async     → non-blocking, no render-blocking
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&libraries=places&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      _gmapsLoadPromise = null; // allow retry on next open if network failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
      reject(
        new Error(
          "Không thể tải Google Maps. Kiểm tra kết nối mạng hoặc API key.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return _gmapsLoadPromise;
}

// ─── MapPickerModal ───────────────────────────────────────────────────────
//
// Uses Google Maps JavaScript API + Places Autocomplete (AutocompleteService
// pattern, NOT the Autocomplete widget, for full DOM control + session billing).
//
// Flow A — Autocomplete pick:
//   Gõ ≥2 chars → debounce 300ms → getPlacePredictions → dropdown
//   Pick suggestion → getDetails (geometry.location only) → placePin + flyTo
//
// Flow B — Direct map click:
//   Click on map → placePin at clicked LatLng
//   Address field is NOT auto-filled (no reverse geocode API call — cost guard).
//   User types/edits the address manually.
//
// Flow C — Text-only confirm:
//   Type address → Xác nhận without picking a suggestion → returns
//   formattedAddress with latitude=null, longitude=null. Backend geocodes.

const VN_CENTER = { lat: 16.047079, lng: 108.20623 };
const VN_ZOOM = 6;

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface PinnedLocation {
  lat: number;
  lng: number;
}

function MapPickerModal({
  open,
  onClose,
  onSelect,
  initialLocation = "",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (result: MapPickerResult) => void;
  initialLocation?: string;
}) {
  const [query, setQuery] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [pinned, setPinned] = useState<PinnedLocation | null>(null);
  const [pinnedLabel, setPinnedLabel] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  // True while BE reverse geocode is in-flight after a map click
  const [reverseLoading, setReverseLoading] = useState(false);
  // Incremented on every map click — lets us discard responses from
  // previous clicks if the user clicks again before the first resolves.
  const reverseSeqRef = useRef(0);

  // Google Maps instances
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  // One session token per query → pick cycle (cost safeguard — see comment above)
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sequence counter: prevents stale Autocomplete responses from overwriting
  // a newer in-flight request's results.
  const autocompleteSeqRef = useRef(0);
  // Prevents double-clicking a suggestion from firing PlaceDetails twice.
  const placeDetailsPendingRef = useRef(false);

  // ─── Map init via callback ref ─────────────────────────────────────────
  // Using a callback ref (not useRef + useEffect) because Radix Dialog
  // portals the content into a new DOM node — useEffect([open]) fires
  // before the portal node exists. The callback fires exactly when the
  // div is attached to the document.

  const mapDivRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || mapRef.current) return;
      if (!open) return;

      setMapLoading(true);
      setMapError(null);

      loadGoogleMaps()
        .then((gmaps) => {
          if (mapRef.current) return; // StrictMode double-fire guard

          const map = new gmaps.Map(node, {
            center: VN_CENTER,
            zoom: VN_ZOOM,
            clickableIcons: false, // avoid unintentional POI popups
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });

          mapRef.current = map;
          autocompleteServiceRef.current =
            new gmaps.places.AutocompleteService();
          placesServiceRef.current = new gmaps.places.PlacesService(map);
          sessionTokenRef.current = new gmaps.places.AutocompleteSessionToken();

          // Map click → pin immediately, then call BE reverse geocode to
          // resolve a real address string. The reverseSeqRef guards against
          // a previous slow request overwriting results from a newer click.
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            placePinOnMap(lat, lng, map);
            setSuggestionsOpen(false);

            // Show coords immediately as a fallback label while BE responds
            const coordFallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setQuery(coordFallback);
            setPinnedLabel(coordFallback);
            setReverseLoading(true);

            const seq = ++reverseSeqRef.current;
            api
              .reverseGeocode(lat, lng)
              .then((result) => {
                if (seq !== reverseSeqRef.current) return; // stale — newer click fired
                const addr = result.formattedAddress ?? coordFallback;
                setQuery(addr);
                setPinnedLabel(addr);
              })
              .catch(() => {
                if (seq !== reverseSeqRef.current) return;
                // Silently keep the coord fallback already shown
              })
              .finally(() => {
                if (seq === reverseSeqRef.current) setReverseLoading(false);
              });
          });

          setMapLoading(false);
          // Trigger resize after modal open animation settles
          requestAnimationFrame(() => {
            gmaps.event.trigger(map, "resize");
          });
        })
        .catch((err: Error) => {
          setMapLoading(false);
          setMapError(err.message);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  // ─── Reset when modal opens ────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setQuery(initialLocation);
      setSuggestions([]);
      setSuggestionsOpen(false);
      setPinned(null);
      setPinnedLabel(null);
      setMapError(null);
    }
  }, [open, initialLocation]);

  // ─── Cleanup when modal closes ─────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      if (mapRef.current && typeof google !== "undefined" && google.maps) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
      markerRef.current = null;
      autocompleteServiceRef.current = null;
      placesServiceRef.current = null;
      sessionTokenRef.current = null;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      autocompleteSeqRef.current = 0;
      placeDetailsPendingRef.current = false;
      reverseSeqRef.current = 0;
      setReverseLoading(false);
    }
  }, [open]);

  // ─── Place a pin on the map ────────────────────────────────────────────

  const placePinOnMap = useCallback(
    (lat: number, lng: number, mapInstance?: google.maps.Map) => {
      const map = mapInstance ?? mapRef.current;
      if (!map || typeof google === "undefined") return;

      setPinned({ lat, lng });
      setMapError(null);

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
        animation: google.maps.Animation.DROP,
      });

      map.panTo({ lat, lng });
      const currentZoom = map.getZoom() ?? VN_ZOOM;
      if (currentZoom < 14) map.setZoom(15);
    },
    [],
  );

  // ─── Debounced Places Autocomplete ────────────────────────────────────

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setMapError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    if (!autocompleteServiceRef.current) return;

    const seq = ++autocompleteSeqRef.current;
    setSuggestLoading(true);

    debounceRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current || !sessionTokenRef.current) {
        setSuggestLoading(false);
        return;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value.trim(),
          sessionToken: sessionTokenRef.current,
          componentRestrictions: { country: "vn" },
          // No 'types' restriction → covers addresses, POIs, regions
        },
        (predictions, status) => {
          if (seq !== autocompleteSeqRef.current) return; // stale response

          setSuggestLoading(false);

          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(
              predictions.map((p) => ({
                place_id: p.place_id,
                description: p.description,
              })),
            );
            setSuggestionsOpen(true);
          } else {
            setSuggestions([]);
            setSuggestionsOpen(false);
          }
        },
      );
    }, 300);
  };

  // ─── Handle suggestion pick (PlaceDetails) ────────────────────────────
  // Fetches geometry.location only (Basic Data tier — lowest cost).
  // Rotates session token afterwards so the next query is a fresh session.

  const handleSelectSuggestion = (item: PlacePrediction) => {
    if (placeDetailsPendingRef.current) return;
    if (!placesServiceRef.current || !sessionTokenRef.current) return;

    placeDetailsPendingRef.current = true;
    setQuery(item.description);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setPinnedLabel(item.description);

    placesServiceRef.current.getDetails(
      {
        placeId: item.place_id,
        fields: ["geometry.location"], // only Basic Data — cheapest tier
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        placeDetailsPendingRef.current = false;

        // Rotate token — the consumed token ends the billing session
        if (typeof google !== "undefined" && google.maps) {
          sessionTokenRef.current =
            new google.maps.places.AutocompleteSessionToken();
        }

        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          placePinOnMap(
            place.geometry.location.lat(),
            place.geometry.location.lng(),
          );
        } else {
          // PlaceDetails failed — accept address text without coords
          setPinned(null);
          setMapError(
            "Không thể lấy tọa độ cho địa điểm này. Địa chỉ vẫn được ghi nhận.",
          );
        }
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setSuggestionsOpen(false);
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionsOpen && suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      }
    }
  };

  const handleConfirm = () => {
    if (pinned) {
      onSelect({
        formattedAddress: pinnedLabel ?? query,
        latitude: pinned.lat,
        longitude: pinned.lng,
      });
    } else {
      onSelect({
        formattedAddress: query.trim(),
        latitude: null,
        longitude: null,
      });
    }
    onClose();
  };

  const canConfirm = pinned !== null || query.trim().length >= 3;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-modal shadow-modal w-[calc(100%-2rem)] max-w-2xl z-[60] flex flex-col max-h-[90vh] overflow-hidden">
          <Dialog.Title className="sr-only">
            Chọn vị trí trên bản đồ
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Gõ địa chỉ để tìm kiếm hoặc click trực tiếp trên bản đồ
          </Dialog.Description>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
            <div className="w-8 h-8 bg-primary-50 rounded-btn flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-ink-800">
                Chọn vị trí trang trại
              </p>
              <p className="text-xs text-ink-400">
                Gõ địa chỉ rồi xác nhận, hoặc click trực tiếp trên bản đồ để
                ghim vị trí
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
            {/* Search + autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-2 border border-border-strong rounded-btn bg-surface px-3 focus-within:ring-2 focus-within:ring-primary">
                <Search className="w-4 h-4 text-ink-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() =>
                    suggestions.length > 0 && setSuggestionsOpen(true)
                  }
                  placeholder="Gõ tên đường, phường, quận, tỉnh... (VD: Hoàng Bá Huân, Củ Chi)"
                  className="flex-1 py-2.5 text-sm text-ink-700 bg-transparent outline-none placeholder:text-ink-400"
                  autoComplete="off"
                />
                {suggestLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                )}
                {query && !suggestLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                      setSuggestionsOpen(false);
                    }}
                    className="text-ink-400 hover:text-ink-700 shrink-0"
                    tabIndex={-1}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {suggestionsOpen && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-btn shadow-modal z-10 max-h-52 overflow-y-auto">
                  {suggestions.map((item) => (
                    <li key={item.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-3 py-2.5 text-sm text-ink-700 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{item.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-ink-400 -mt-1">
              Gõ ít nhất 2 ký tự để hiện gợi ý · Click trực tiếp lên bản đồ để
              ghim tọa độ — ô địa chỉ sẽ tự điền tọa độ, bạn có thể sửa lại
              thành tên địa chỉ thực
            </p>

            {/* Error */}
            {mapError && (
              <div className="flex items-start gap-2 p-3 bg-status-danger-bg/40 border border-status-danger-fg/20 rounded-btn">
                <AlertCircle className="w-4 h-4 text-status-danger-fg mt-0.5 shrink-0" />
                <p className="text-sm text-status-danger-fg">{mapError}</p>
              </div>
            )}

            {/* Map loading skeleton */}
            {mapLoading && (
              <div
                className="w-full rounded-btn border border-border flex items-center justify-center bg-surface-subtle"
                style={{ height: 300 }}
              >
                <div className="flex items-center gap-2 text-sm text-ink-500">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Đang tải bản đồ...</span>
                </div>
              </div>
            )}

            {/* Map div — hidden while loading to avoid 0-height init */}
            <div
              ref={mapDivRef}
              className="w-full rounded-btn overflow-hidden border border-border"
              style={{ height: 300, display: mapLoading ? "none" : "block" }}
            />

            {/* Pin / address status indicator */}
            {pinned ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary/20 rounded-btn">
                {reverseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  {reverseLoading ? (
                    <span className="text-xs text-ink-500">
                      Đang tra địa chỉ...
                    </span>
                  ) : (
                    <span className="text-xs text-primary-700 truncate">
                      {pinnedLabel ??
                        `${pinned.lat.toFixed(6)}, ${pinned.lng.toFixed(6)}`}
                    </span>
                  )}
                  <span className="text-xs text-ink-400 font-mono">
                    {pinned.lat.toFixed(6)}, {pinned.lng.toFixed(6)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPinned(null);
                    setPinnedLabel(null);
                    setQuery("");
                    setReverseLoading(false);
                    reverseSeqRef.current++;
                    if (markerRef.current) {
                      markerRef.current.setMap(null);
                      markerRef.current = null;
                    }
                  }}
                  className="text-xs text-ink-400 hover:text-status-danger-fg transition-colors shrink-0"
                >
                  Xóa pin
                </button>
              </div>
            ) : query.trim().length >= 3 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-subtle border border-border rounded-btn">
                <MapPin className="w-4 h-4 text-ink-400 shrink-0" />
                <span className="text-xs text-ink-500">
                  Địa chỉ sẽ được dùng trực tiếp (không có tọa độ GPS). Chọn gợi
                  ý hoặc click bản đồ để thêm tọa độ.
                </span>
              </div>
            ) : (
              <p className="text-xs text-ink-400 text-center py-1">
                Chưa chọn vị trí
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Xác nhận vị trí
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── FarmFormFields ───────────────────────────────────────────────────────

function FarmFormFields({
  formData,
  setFormData,
  errors = {},
}: {
  formData: FarmFormData;
  setFormData: React.Dispatch<React.SetStateAction<FarmFormData>>;
  errors?: FarmFormErrors;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  const handleGeocodeSelect = (result: MapPickerResult) => {
    setFormData((p) => ({
      ...p,
      location: result.formattedAddress || p.location,
      ...(result.latitude != null && result.longitude != null
        ? { latitude: result.latitude, longitude: result.longitude }
        : {}),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Tên trang trại"
          required
          value={formData.name}
          onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
          placeholder="Trang trại Thung lũng Xanh"
          error={errors.name}
        />
        <FormField
          label="Địa chỉ"
          required
          value={formData.location}
          onChange={(v) => setFormData((p) => ({ ...p, location: v }))}
          placeholder="Đà Lạt, Lâm Đồng, Việt Nam"
          error={errors.location}
          trailingAddon={
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              title="Chọn tọa độ trên bản đồ"
              className="h-full px-2.5 border border-border-strong rounded-btn text-primary hover:bg-primary-50 hover:border-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
          }
        />
      </div>

      {/* Coordinates chip */}
      {formData.latitude != null && formData.longitude != null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary/20 rounded-btn">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary-700 font-mono">
            {fmtCoord(formData.latitude)}, {fmtCoord(formData.longitude)}
          </span>
          <span className="text-xs text-ink-400 ml-1">
            · Tọa độ đã xác định
          </span>
          <button
            type="button"
            onClick={() =>
              setFormData((p) => ({
                ...p,
                latitude: undefined,
                longitude: undefined,
              }))
            }
            className="ml-auto text-xs text-ink-400 hover:text-status-danger-fg transition-colors"
          >
            Xóa
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Diện tích (m²)"
          required
          type="number"
          value={formData.area}
          onChange={(v) => setFormData((p) => ({ ...p, area: v }))}
          placeholder="5000"
          error={errors.area}
          inputProps={{ min: 1 }}
        />
        <FormSelect
          label="Trạng thái"
          value={formData.status}
          onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
          options={STATUS_OPTIONS}
        />
      </div>

      <MapPickerModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={handleGeocodeSelect}
        initialLocation={formData.location}
      />
    </div>
  );
}

// ─── FarmCard ─────────────────────────────────────────────────────────────

function FarmCard({
  farm,
  onView,
  onEdit,
  onDelete,
}: {
  farm: Farm;
  onView: (f: Farm) => void;
  onEdit: (f: Farm) => void;
  onDelete: (f: Farm) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-5 flex items-center gap-3">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 bg-primary-50 rounded-card flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-primary-700 truncate">
                {farm.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-ink-500 mt-0.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{farm.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge
              label={farmStatusLabel(farm.status)}
              tone={farmStatusTone(farm.status)}
            />
            <span className="text-sm text-ink-500">
              {farm.area.toLocaleString()} m²
            </span>
            <RowActions
              onView={() => onView(farm)}
              onEdit={() => onEdit(farm)}
              onDelete={() => onDelete(farm)}
              align="center"
            />
            <Collapsible.Trigger className="p-1.5 text-ink-500 hover:text-primary-700 transition-colors">
              {open ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Collapsible.Trigger>
          </div>
        </div>

        <Collapsible.Content>
          <div className="border-t border-surface-subtle p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-ink-400 uppercase mb-1">
                  Diện tích
                </div>
                <div className="font-medium text-primary-700">
                  {farm.area.toLocaleString()} m²
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-400 uppercase mb-1">
                  Ngày tạo
                </div>
                <div className="font-medium text-primary-700">
                  {farm.createdAt || "—"}
                </div>
              </div>
              {farm.latitude != null && farm.longitude != null && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-ink-400 uppercase mb-1">
                    Tọa độ GPS
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-sm text-primary-700">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        <span className="font-sans text-xs text-ink-400 mr-1">
                          Vĩ độ
                        </span>
                        {fmtCoord(farm.latitude)}
                      </span>
                      <span className="text-ink-300 mx-0.5">/</span>
                      <span>
                        <span className="font-sans text-xs text-ink-400 mr-1">
                          Kinh độ
                        </span>
                        {fmtCoord(farm.longitude)}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      Xem bản đồ
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

// ─── ViewFarmModal ────────────────────────────────────────────────────────

function ViewFarmModal({
  farm,
  open,
  onClose,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
}) {
  const [weather, setWeather] = useState<WeatherCurrentResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setWeather(null);
      return;
    }
    if (farm.latitude == null || farm.longitude == null) return;
    setWeatherLoading(true);
    api
      .getWeatherCurrentByFarm(farm.id)
      .then((data) => setWeather(data))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [open, farm.id, farm.latitude, farm.longitude]);

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Địa chỉ", value: farm.location },
    { label: "Diện tích", value: `${farm.area.toLocaleString()} m²` },
    { label: "Trạng thái", value: farmStatusLabel(farm.status) },
    { label: "Ngày tạo", value: farm.createdAt },
  ];

  const hasCoords = farm.latitude != null && farm.longitude != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`
    : null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={farm.name}
      description="Chi tiết trang trại"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-1 mb-5">
        {infoRows.map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between py-2 border-b border-surface-subtle last:border-0"
          >
            <span className="text-sm text-ink-500 shrink-0">{label}</span>
            <span className="text-sm font-medium text-primary-700 text-right ml-4 break-all">
              {value || "—"}
            </span>
          </div>
        ))}
        {hasCoords && (
          <div className="py-2 border-b border-surface-subtle last:border-0">
            <div className="flex justify-between items-start">
              <span className="text-sm text-ink-500 shrink-0">Tọa độ GPS</span>
              <div className="text-right ml-4">
                <div className="flex items-center gap-3 justify-end text-sm font-mono text-primary-700">
                  <span>
                    <span className="text-xs font-sans text-ink-400 mr-1">
                      Vĩ độ
                    </span>
                    {fmtCoord(farm.latitude)}
                  </span>
                  <span>
                    <span className="text-xs font-sans text-ink-400 mr-1">
                      Kinh độ
                    </span>
                    {fmtCoord(farm.longitude)}
                  </span>
                </div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                  >
                    <MapPin className="w-3 h-3" />
                    Xem trên bản đồ
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {farm.latitude != null && farm.longitude != null && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-ink-400 uppercase mb-3">
            Thời tiết hiện tại
          </p>
          {weatherLoading && (
            <div className="flex items-center gap-2 text-sm text-ink-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Đang tải thời tiết...</span>
            </div>
          )}
          {!weatherLoading && weather && (
            <div className="bg-primary-50 rounded-btn p-4 space-y-3">
              <div className="flex items-center gap-3">
                {weather.condition?.icon && (
                  <img
                    src={
                      weather.condition.icon.startsWith("//")
                        ? `https:${weather.condition.icon}`
                        : weather.condition.icon
                    }
                    alt={weather.condition.text ?? ""}
                    className="w-10 h-10 shrink-0"
                  />
                )}
                <div>
                  <p className="text-2xl font-bold text-primary-700">
                    {weather.tempC}°C
                  </p>
                  <p className="text-sm text-ink-500">
                    {weather.condition?.text ?? "—"}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-ink-400">Cảm giác như</p>
                  <p className="text-sm font-medium text-ink-700">
                    {weather.feelsLikeC}°C
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-primary/10">
                <WeatherStat label="Độ ẩm" value={`${weather.humidity}%`} />
                <WeatherStat
                  label="Gió"
                  value={`${weather.windKph} km/h ${weather.windDir ?? ""}`}
                />
                <WeatherStat
                  label="Lượng mưa"
                  value={`${weather.precipMm} mm`}
                />
                <WeatherStat label="UV" value={`${weather.uv}`} />
              </div>
              <p className="text-xs text-ink-400 pt-1">
                Cập nhật lúc{" "}
                {new Date(weather.lastUpdated).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
                {" · "}
                {weather.location?.name}
                {weather.location?.region ? `, ${weather.location.region}` : ""}
              </p>
            </div>
          )}
          {!weatherLoading && !weather && (
            <p className="text-sm text-ink-400 py-2">
              Không thể tải thông tin thời tiết.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-ink-700">{value}</p>
    </div>
  );
}

// ─── CreateFarmModal ──────────────────────────────────────────────────────

function CreateFarmModal({
  open,
  onClose,
  onCreate,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: FarmFormData) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<FarmFormData>({
    name: "",
    location: "",
    status: "Hoạt động",
    area: "",
  });
  const [formErrors, setFormErrors] = useState<FarmFormErrors>({});

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", location: "", status: "Hoạt động", area: "" });
      setFormErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFarmForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate(formData);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Thêm trang trại mới"
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting}>
            Tạo trang trại
          </Button>
        </>
      }
    >
      <FarmFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData(updater);
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}

// ─── EditFarmModal ────────────────────────────────────────────────────────

function EditFarmModal({
  farm,
  open,
  onClose,
  onUpdate,
  submitting,
}: {
  farm: Farm;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: FarmFormData) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<FarmFormData>({
    name: farm.name,
    location: farm.location,
    status: farm.status,
    area: farm.area.toString(),
    latitude: farm.latitude,
    longitude: farm.longitude,
  });
  const [formErrors, setFormErrors] = useState<FarmFormErrors>({});

  useEffect(() => {
    setFormData({
      name: farm.name,
      location: farm.location,
      status: farm.status,
      area: farm.area.toString(),
      latitude: farm.latitude,
      longitude: farm.longitude,
    });
    setFormErrors({});
  }, [farm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFarmForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onUpdate(farm.id, formData);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Chỉnh sửa trang trại"
      size="lg"
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <FarmFormFields
        formData={formData}
        setFormData={(updater) => {
          setFormData(updater);
          setFormErrors({});
        }}
        errors={formErrors}
      />
    </Modal>
  );
}

// ─── FarmPage ─────────────────────────────────────────────────────────────

export function FarmPage() {
  const { toasts, showToast, dismissToast } = useToast();
  const queryClient = useQueryClient();

  // ── UI-only state (modals, selection) ──────────────────────────────────
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);

  // ── Read: farm list ────────────────────────────────────────────────────
  const farmsQuery = useQuery({
    queryKey: qk.farms.list(),
    queryFn: async () => {
      const data = await api.getFarms();
      return data
        .sort(
          (a, b) =>
            new Date(a.farmCreatedAt ?? 0).getTime() -
            new Date(b.farmCreatedAt ?? 0).getTime(),
        )
        .map(mapFarm);
    },
  });

  const farms = farmsQuery.data ?? [];
  const loading = farmsQuery.isLoading;

  useEffect(() => {
    if (farmsQuery.error) {
      showToast(
        farmsQuery.error instanceof Error
          ? farmsQuery.error.message
          : "Không thể tải danh sách trang trại",
        "error",
      );
    }
  }, [farmsQuery.error, showToast]);

  // ── Coordinate update helper (fire-and-forget side effect) ─────────────
  // Not wrapped in useMutation — it's a best-effort call that should not
  // block or roll back the parent mutation's success state.
  async function maybeUpdateCoordinates(farmId: string, data: FarmFormData) {
    if (data.latitude == null || data.longitude == null) return;
    try {
      await api.updateFarmCoordinates(farmId, {
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch {
      showToast(
        "Trang trại đã lưu nhưng không thể cập nhật tọa độ GPS",
        "info",
      );
    }
  }

  // ── Mutation: create ───────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: FarmFormData) => {
      const created = await api.createFarm({
        farmName: data.name.trim(),
        farmLocation: data.location.trim(),
        farmArea: parseFloat(data.area) || 0,
        farmStatus: data.status === "Hoạt động" ? "Active" : "Inactive",
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
      });
      // created may be null if the API returns no body — guard before
      // attempting the coordinate fallback call
      if (
        created?.farmId &&
        (data.latitude != null || data.longitude != null)
      ) {
        await maybeUpdateCoordinates(created.farmId, data);
      }
      return created;
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      showToast("Tạo trang trại thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.farms.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể tạo trang trại",
        "error",
      );
    },
  });

  // ── Mutation: update ───────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FarmFormData }) => {
      await api.updateFarm(id, {
        farmName: data.name.trim(),
        farmLocation: data.location.trim(),
        farmArea: parseFloat(data.area) || 0,
        farmStatus: data.status === "Hoạt động" ? "Active" : "Inactive",
      });
      await maybeUpdateCoordinates(id, data);
    },
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedFarm(null);
      showToast("Cập nhật trang trại thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.farms.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể cập nhật trang trại",
        "error",
      );
    },
  });

  // ── Mutation: delete ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (farmId: string) => api.deleteFarm(farmId),
    onSuccess: () => {
      setFarmToDelete(null);
      showToast("Xóa trang trại thành công", "success");
      queryClient.invalidateQueries({ queryKey: qk.farms.all });
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Không thể xóa trang trại",
        "error",
      );
    },
  });

  // ── Adapter handlers (keep downstream prop signatures unchanged) ────────
  const handleView = (farm: Farm) => {
    setSelectedFarm(farm);
    setViewModalOpen(true);
  };

  const handleEdit = (farm: Farm) => {
    setSelectedFarm(farm);
    setEditModalOpen(true);
  };

  const handleDelete = (farm: Farm) => setFarmToDelete(farm);

  const confirmDelete = () => {
    if (farmToDelete) deleteMutation.mutate(farmToDelete.id);
  };

  const handleCreate = (data: FarmFormData) => createMutation.mutate(data);

  const handleUpdate = (id: string, data: FarmFormData) =>
    updateMutation.mutate({ id, data });

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        icon={Tractor}
        title="Trang Trại"
        subtitle="Quản lý danh sách trang trại"
        actions={
          <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>
            Thêm trang trại
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : farms.length === 0 ? (
        <EmptyState
          icon={Home}
          message="Chưa có trang trại nào"
          action={
            <Button leadingIcon={Plus} onClick={() => setCreateModalOpen(true)}>
              Thêm trang trại
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {selectedFarm && (
        <ViewFarmModal
          farm={selectedFarm}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedFarm(null);
          }}
        />
      )}

      <CreateFarmModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
        submitting={createMutation.isPending}
      />

      {selectedFarm && (
        <EditFarmModal
          farm={selectedFarm}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedFarm(null);
          }}
          onUpdate={handleUpdate}
          submitting={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={farmToDelete !== null}
        onOpenChange={(o) => !o && setFarmToDelete(null)}
        title="Xóa trang trại"
        description={
          <>
            Bạn có chắc muốn xóa trang trại{" "}
            <strong>{farmToDelete?.name}</strong>? Hành động này không thể hoàn
            tác.
          </>
        }
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Cloud Console Map ID optional; DEMO_MAP_ID works for AdvancedMarker in most setups. */
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
const DEFAULT_CENTER = { lat: 30.2672, lng: -97.7431 };
const DEFAULT_ZOOM = 12;

type LatLngLiteral = { lat: number; lng: number };

type AddressComponent = {
  longText?: string | null;
  shortText?: string | null;
  types: string[];
};

type PlaceLike = {
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
  formattedAddress?: string | null;
  displayName?: string | null;
  addressComponents?: AddressComponent[];
  location?: LatLngLiteral | { lat: () => number; lng: () => number } | null;
  viewport?: unknown;
};

type PlacePredictionLike = {
  toPlace: () => PlaceLike;
};

type PlaceAutocompleteElementInstance = HTMLElement & {
  addEventListener: (
    type: string,
    listener: (event: Event & { placePrediction?: PlacePredictionLike }) => void,
  ) => void;
  removeEventListener: (
    type: string,
    listener: (event: Event & { placePrediction?: PlacePredictionLike }) => void,
  ) => void;
};

type PlacesLibrary = {
  PlaceAutocompleteElement: new (
    opts?: Record<string, unknown>,
  ) => PlaceAutocompleteElementInstance;
};

type MapInstance = {
  setCenter: (center: LatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  fitBounds?: (bounds: unknown) => void;
};

type AdvancedMarkerInstance = {
  map: MapInstance | null;
  position: LatLngLiteral | null;
  title?: string;
};

type MapsLibrary = {
  Map: new (
    el: HTMLElement,
    opts: {
      center: LatLngLiteral;
      zoom: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      mapId?: string;
    },
  ) => MapInstance;
};

type MarkerLibrary = {
  AdvancedMarkerElement: new (opts: {
    map?: MapInstance | null;
    position?: LatLngLiteral | null;
    title?: string;
  }) => AdvancedMarkerInstance;
};

declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary: {
          (name: "places"): Promise<PlacesLibrary>;
          (name: "maps"): Promise<MapsLibrary>;
          (name: "marker"): Promise<MarkerLibrary>;
        };
      };
    };
  }
}

function ensureMapsBootstrap(apiKey: string): void {
  if (typeof window === "undefined") return;

  const w = window as Window & {
    google?: { maps?: { importLibrary?: unknown; __ib__?: (v?: unknown) => void } };
  };

  w.google = w.google || ({} as NonNullable<typeof w.google>);
  w.google.maps = w.google.maps || ({} as NonNullable<typeof w.google.maps>);

  if (typeof w.google.maps.importLibrary === "function") return;

  let bootstrapPromise: Promise<unknown> | undefined;
  const pendingLibraries = new Set<string>();
  const params = new URLSearchParams({
    key: apiKey,
    v: "weekly",
  });

  const loadScript = () =>
    (bootstrapPromise ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      params.set("libraries", [...pendingLibraries].join(","));
      params.set("callback", "google.maps.__ib__");
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      w.google!.maps!.__ib__ = resolve;
      script.onerror = () => {
        bootstrapPromise = undefined;
        reject(new Error("The Google Maps JavaScript API could not load."));
      };
      document.head.appendChild(script);
    }));

  w.google.maps.importLibrary = ((library: string, ...args: unknown[]) => {
    pendingLibraries.add(library);
    return loadScript().then(() => {
      const realImport = w.google?.maps?.importLibrary;
      if (typeof realImport !== "function") {
        throw new Error("Google Maps finished loading but importLibrary is still unavailable.");
      }
      return (realImport as (name: string, ...rest: unknown[]) => Promise<unknown>)(
        library,
        ...args,
      );
    });
  }) as typeof w.google.maps.importLibrary;
}

async function loadMapsLibraries(apiKey: string) {
  ensureMapsBootstrap(apiKey);
  const [places, maps, marker] = await Promise.all([
    window.google!.maps.importLibrary("places"),
    window.google!.maps.importLibrary("maps"),
    window.google!.maps.importLibrary("marker"),
  ]);
  return { places, maps, marker };
}

function toLatLng(value: PlaceLike["location"]): LatLngLiteral | null {
  if (!value) return null;
  if (typeof (value as { lat?: unknown }).lat === "function") {
    const loc = value as { lat: () => number; lng: () => number };
    return { lat: loc.lat(), lng: loc.lng() };
  }
  const literal = value as LatLngLiteral;
  if (typeof literal.lat === "number" && typeof literal.lng === "number") {
    return literal;
  }
  return null;
}

function extractCity(components: AddressComponent[] | undefined): string {
  if (!components) return "";
  const locality = components.find((c) => c.types.includes("locality"));
  if (locality?.longText) return locality.longText;
  const admin2 = components.find((c) => c.types.includes("administrative_area_level_2"));
  if (admin2?.longText) return admin2.longText;
  const admin1 = components.find((c) => c.types.includes("administrative_area_level_1"));
  return admin1?.longText ?? "";
}

interface PlacesLocationFieldProps {
  city: string;
  address: string;
  onChange: (next: { city: string; address: string }) => void;
}

export function PlacesLocationField({ city, address, onChange }: PlacesLocationFieldProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapApiRef = useRef<{
    map: MapInstance;
    marker: AdvancedMarkerInstance;
  } | null>(null);
  const onChangeRef = useRef(onChange);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [manualFallback, setManualFallback] = useState(!GOOGLE_MAPS_KEY);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    let cancelled = false;

    void loadMapsLibraries(GOOGLE_MAPS_KEY)
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setMapsError(err instanceof Error ? err.message : "Maps unavailable.");
          setManualFallback(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !hostRef.current) return;

    let cancelled = false;
    let element: PlaceAutocompleteElementInstance | null = null;
    let onSelect: ((event: Event & { placePrediction?: PlacePredictionLike }) => void) | null =
      null;
    let onError: ((event: Event) => void) | null = null;

    void (async () => {
      try {
        const { places, maps, marker: markerLib } = await loadMapsLibraries(GOOGLE_MAPS_KEY);
        if (cancelled || !mapRef.current || !hostRef.current) return;

        const map = new maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapId: GOOGLE_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: DEFAULT_CENTER,
          title: "Business location",
        });
        mapApiRef.current = { map, marker };

        hostRef.current.replaceChildren();
        element = new places.PlaceAutocompleteElement({});
        element.style.display = "block";
        element.style.width = "100%";
        hostRef.current.appendChild(element);

        onSelect = async (event) => {
          const prediction = event.placePrediction;
          if (!prediction) return;
          const place = prediction.toPlace();
          await place.fetchFields({
            fields: [
              "formattedAddress",
              "displayName",
              "addressComponents",
              "location",
              "viewport",
            ],
          });

          const nextCity = extractCity(place.addressComponents);
          const nextAddress = place.formattedAddress ?? place.displayName ?? "";
          onChangeRef.current({
            city: nextCity || nextAddress.split(",")[0]?.trim() || "",
            address: nextAddress,
          });

          const position = toLatLng(place.location);
          const api = mapApiRef.current;
          if (!api || !position) return;

          if (place.viewport && typeof api.map.fitBounds === "function") {
            api.map.fitBounds(place.viewport);
          } else {
            api.map.setCenter(position);
            api.map.setZoom(16);
          }
          api.marker.position = position;
        };

        onError = () => {
          setMapsError(
            "Places search failed. Enable “Places API (New)” for this Google Cloud key, or enter location manually.",
          );
          setManualFallback(true);
        };

        element.addEventListener("gmp-select", onSelect);
        element.addEventListener("gmp-error", onError);
      } catch (err) {
        if (!cancelled) {
          setMapsError(err instanceof Error ? err.message : "Places widget unavailable.");
          setManualFallback(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (element && onSelect) element.removeEventListener("gmp-select", onSelect);
      if (element && onError) element.removeEventListener("gmp-error", onError);
      if (hostRef.current) hostRef.current.replaceChildren();
      if (mapApiRef.current) {
        mapApiRef.current.marker.map = null;
        mapApiRef.current = null;
      }
    };
  }, [mapsReady]);

  if (manualFallback) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted">
          {mapsError
            ? mapsError
            : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and enable Places API (New), or enter location manually."}
        </p>
        <div>
          <Label htmlFor="city">City / location</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => onChange({ city: e.target.value, address })}
            placeholder="Austin"
            required
          />
        </div>
        <div>
          <Label htmlFor="address">Street address (optional)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => onChange({ city, address: e.target.value })}
            placeholder="4800 South Congress Ave"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Business location (Google Maps)</Label>
        <div className="mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div
            ref={mapRef}
            className="h-52 w-full bg-[linear-gradient(135deg,#e8f2ef,#f7faf8)] sm:h-64"
            aria-label="Business location map"
          />
          <div className="border-t border-line p-3">
            <div
              ref={hostRef}
              className="places-autocomplete-host min-h-11 overflow-visible [&_gmp-place-autocomplete]:block [&_gmp-place-autocomplete]:w-full"
            />
            <p className="mt-2 text-xs text-muted">
              Search and pick a place — the map updates to that location.
            </p>
          </div>
        </div>
      </div>
      {city || address ? (
        <div className="rounded-xl border border-line bg-background px-4 py-3 text-sm">
          <p className="font-medium">{city || "City pending"}</p>
          {address ? <p className="mt-1 text-muted">{address}</p> : null}
        </div>
      ) : null}
      <button
        type="button"
        className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => setManualFallback(true)}
      >
        Enter location manually instead
      </button>
    </div>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

type RideTracePoint = {
  lat: number;
  lng: number;
};

type RideTraceMapLeafletProps = {
  points: RideTracePoint[];
};

const PINCH_ZOOM_SENSITIVITY = 1.9;

function buildBounds(points: RideTracePoint[]) {
  if (points.length < 2) {
    return null;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latPadding = Math.max(0.002, (maxLat - minLat) * 0.08);
  const lngPadding = Math.max(0.002, (maxLng - minLng) * 0.08);

  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding],
  ] satisfies LatLngBoundsExpression;
}

export function RideTraceMapLeaflet({ points }: RideTraceMapLeafletProps) {
  const bounds = useMemo(() => buildBounds(points), [points]);
  const polyline = useMemo<LatLngExpression[]>(
    () => points.map((point) => [point.lat, point.lng] as LatLngExpression),
    [points],
  );

  if (!bounds || polyline.length < 2) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Strava map trace is not available for this ride.
      </p>
    );
  }

  const start = polyline[0];
  const finish = polyline[polyline.length - 1];

  return (
    <div className="h-56 w-full overflow-hidden rounded-md border border-slate-200">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        className="h-full w-full"
        scrollWheelZoom
        wheelPxPerZoomLevel={32}
        touchZoom
        dragging
        doubleClickZoom
        keyboard={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
      >
        <MapGestureCoordinator />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline
          positions={polyline}
          pathOptions={{
            color: "#0ea5e9",
            weight: 5,
            opacity: 0.95,
          }}
        />

        <CircleMarker
          center={start}
          radius={6}
          pathOptions={{
            color: "#166534",
            weight: 2,
            fillColor: "#22c55e",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            Start
          </Tooltip>
        </CircleMarker>

        <CircleMarker
          center={finish}
          radius={6}
          pathOptions={{
            color: "#7f1d1d",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            Finish
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

function MapGestureCoordinator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let gestureStartZoom: number | null = null;
    let gestureStartScale = 1;
    let gestureActive = false;

    const clampZoom = (value: number) => {
      let next = value;
      const minZoom = map.getMinZoom();
      const maxZoom = map.getMaxZoom();

      if (Number.isFinite(minZoom)) {
        next = Math.max(minZoom, next);
      }

      if (Number.isFinite(maxZoom)) {
        next = Math.min(maxZoom, next);
      }

      return next;
    };

    const isEventOverMap = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && container.contains(target)) {
        return true;
      }

      const eventWithCoords = event as Event & { clientX?: number; clientY?: number };
      if (
        typeof eventWithCoords.clientX === "number" &&
        typeof eventWithCoords.clientY === "number"
      ) {
        const rect = container.getBoundingClientRect();
        return (
          eventWithCoords.clientX >= rect.left &&
          eventWithCoords.clientX <= rect.right &&
          eventWithCoords.clientY >= rect.top &&
          eventWithCoords.clientY <= rect.bottom
        );
      }

      return container.matches(":hover");
    };

    const handleGestureStart = (event: Event) => {
      if (!isEventOverMap(event)) {
        return;
      }

      event.preventDefault();
      const scaleCandidate = (event as Event & { scale?: number }).scale;
      gestureStartScale =
        typeof scaleCandidate === "number" && Number.isFinite(scaleCandidate) && scaleCandidate > 0
          ? scaleCandidate
          : 1;
      gestureStartZoom = map.getZoom();
      gestureActive = true;
    };

    const handleGestureChange = (event: Event) => {
      if (!gestureActive || gestureStartZoom === null) {
        return;
      }

      event.preventDefault();
      const scaleCandidate = (event as Event & { scale?: number }).scale;
      const currentScale =
        typeof scaleCandidate === "number" && Number.isFinite(scaleCandidate) && scaleCandidate > 0
          ? scaleCandidate
          : gestureStartScale;
      const deltaZoom =
        Math.log2(currentScale / gestureStartScale) * PINCH_ZOOM_SENSITIVITY;

      map.setZoom(clampZoom(gestureStartZoom + deltaZoom), {
        animate: false,
      });
    };

    const handleGestureEnd = (event: Event) => {
      if (!gestureActive) {
        return;
      }

      event.preventDefault();
      gestureStartZoom = null;
      gestureActive = false;
    };

    container.addEventListener("gesturestart", handleGestureStart, { passive: false });
    window.addEventListener("gesturestart", handleGestureStart, { passive: false });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false });
    window.addEventListener("gestureend", handleGestureEnd, { passive: false });

    return () => {
      container.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
      window.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [map]);

  return null;
}

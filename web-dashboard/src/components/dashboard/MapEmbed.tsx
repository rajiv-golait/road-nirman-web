'use client';

import dynamic from 'next/dynamic';
import type { Ticket, Zone } from '@/lib/types/database';

const SafeMapboxMap = dynamic(
  () => import('@/components/map/SafeMapboxMap').then((m) => m.SafeMapboxMap),
  { ssr: false, loading: () => <div className="w-full h-[70vh] bg-slate-100 animate-pulse rounded-xl" /> }
);

export type MapChronicLocation = {
  id: string;
  latitude: number;
  longitude: number;
  address_text?: string | null;
  complaint_count: number;
};

interface MapEmbedProps {
  tickets: Ticket[];
  /** Zone polygons from `fetchZonesForMap` (Supabase RPC); canonical v1 boundary source. */
  zones?: Zone[];
  chronicLocations?: MapChronicLocation[];
  darkMode?: boolean;
  height?: string;
}

export function MapEmbed({
  tickets,
  zones = [],
  chronicLocations = [],
  darkMode,
  height = '70vh',
}: MapEmbedProps) {
  return (
    <SafeMapboxMap
      tickets={tickets}
      zones={zones}
      chronicLocations={chronicLocations}
      darkMode={darkMode}
      height={height}
    />
  );
}

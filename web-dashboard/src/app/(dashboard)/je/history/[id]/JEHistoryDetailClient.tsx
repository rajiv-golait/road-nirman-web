'use client';

import { useState } from 'react';
import { timeAgo } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  performed_by?: string | null;
}

interface Photo {
  id: string;
  photo_type: 'before' | 'after' | 'progress';
  storage_path: string;
  created_at: string;
  metadata?: {
    quality?: 'high' | 'medium' | 'low';
    resolution?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

interface SSIMResult {
  id: string;
  score: number;
  result: 'pass' | 'fail';
  details: Record<string, unknown>;
  created_at: string;
}

interface JEHistoryDetailClientProps {
  ticket: Record<string, unknown>;
  events: TimelineEvent[];
  photos: Photo[];
  ssimResults: SSIMResult | null;
}

export default function JEHistoryDetailClient({
  events,
  photos,
  ssimResults,
}: JEHistoryDetailClientProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'photos'>('timeline');
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<string[]>([]);

  const beforePhotos = photos.filter((photo) => photo.photo_type === 'before');
  const afterPhotos = photos.filter((photo) => photo.photo_type === 'after');
  const selectedPhotoBroken = selectedPhoto ? brokenPhotoIds.includes(selectedPhoto.id) : false;

  function markPhotoBroken(photoId: string) {
    setBrokenPhotoIds((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'timeline'
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>timeline</span>
            Timeline
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
              {events.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'photos'
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_library</span>
            Photos
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
              {photos.length}
            </span>
          </button>
        </div>

        {activeTab === 'timeline' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-6">
              {events.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>event_note</span>
                  <p className="text-sm">No events recorded for this ticket</p>
                </div>
              ) : (
                events.map((event, idx) => (
                  <TimelineItem key={event.id} event={event} isLast={idx === events.length - 1} />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            {beforePhotos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>photo_camera</span>
                  Before Photos
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {beforePhotos.map((photo) => (
                    <PhotoThumbnail
                      key={photo.id}
                      photo={photo}
                      isBroken={brokenPhotoIds.includes(photo.id)}
                      onError={() => markPhotoBroken(photo.id)}
                      onClick={() => setSelectedPhoto(photo)}
                    />
                  ))}
                </div>
              </div>
            )}

            {afterPhotos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-symbols-outlined text-green-500" style={{ fontSize: 18 }}>check_circle</span>
                  After Photos
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {afterPhotos.map((photo) => (
                    <PhotoThumbnail
                      key={photo.id}
                      photo={photo}
                      isBroken={brokenPhotoIds.includes(photo.id)}
                      onError={() => markPhotoBroken(photo.id)}
                      onClick={() => setSelectedPhoto(photo)}
                    />
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
                <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>no_photography</span>
                <p className="text-sm">No photos available for this ticket</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>verified</span>
            SSIM Analysis
          </h3>

          {ssimResults ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="-rotate-90 transform h-24 w-24">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - ssimResults.score)}
                      strokeLinecap="round"
                      className={ssimResults.score >= 0.7 ? 'text-green-500' : ssimResults.score >= 0.5 ? 'text-amber-500' : 'text-red-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-headline font-black text-slate-800">
                      {(ssimResults.score * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] uppercase text-slate-500">Score</span>
                  </div>
                </div>
                <p className={`mt-2 text-sm font-bold ${ssimResults.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                  {ssimResults.result === 'pass' ? 'PASSED' : 'FAILED'}
                </p>
              </div>

              {ssimResults.details && Object.keys(ssimResults.details).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Details</p>
                  {Object.entries(ssimResults.details).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-0">
                      <span className="text-xs capitalize text-slate-500">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-slate-700">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-center text-[10px] text-slate-400">
                Analyzed {timeAgo(ssimResults.created_at)}
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400">
              <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 32 }}>pending</span>
              <p className="text-sm">SSIM analysis not yet completed</p>
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 flex items-center gap-1 text-sm text-white hover:text-slate-300"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              Close
            </button>
            <div className="overflow-hidden rounded-lg bg-white">
              {selectedPhotoBroken ? (
                <div className="aspect-video flex items-center justify-center bg-slate-100">
                  <div className="max-w-lg px-6 text-center text-slate-500">
                    <span className="material-symbols-outlined" style={{ fontSize: 48 }}>broken_image</span>
                    <p className="mt-2 text-sm font-semibold">Image unavailable</p>
                    <p className="mt-1 break-all text-xs">{selectedPhoto.storage_path}</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPhoto.storage_path}
                    alt={`${selectedPhoto.photo_type} ticket evidence`}
                    className="h-full w-full object-contain"
                    onError={() => markPhotoBroken(selectedPhoto.id)}
                  />
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold capitalize text-slate-800">{selectedPhoto.photo_type} Photo</p>
                  <p className="text-xs text-slate-500">{timeAgo(selectedPhoto.created_at)}</p>
                </div>
                <div className="text-right">
                  <a
                    href={selectedPhoto.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Open asset
                  </a>
                  {selectedPhoto.metadata &&
                    Object.entries(selectedPhoto.metadata).slice(0, 2).map(([key, value]) => (
                      <p key={key} className="text-[10px] text-slate-500">
                        {key}: {String(value)}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'swap_horiz';
      case 'escalation':
        return 'priority_high';
      case 'assignment':
        return 'assignment_ind';
      case 'verification':
        return 'verified';
      case 'ssim_check':
        return 'compare';
      case 'payment':
        return 'payments';
      default:
        return 'event';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'bg-blue-500';
      case 'escalation':
        return 'bg-red-500';
      case 'assignment':
        return 'bg-indigo-500';
      case 'verification':
        return 'bg-green-500';
      case 'ssim_check':
        return 'bg-purple-500';
      case 'payment':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${getEventColor(event.event_type)}`}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>
            {getEventIcon(event.event_type)}
          </span>
        </div>
        {!isLast && <div className="my-1 w-0.5 flex-1 bg-slate-200" />}
      </div>

      <div className="flex-1 pb-6">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold capitalize text-slate-800">
                {event.event_type.replace(/_/g, ' ')}
              </p>
              {event.old_status && event.new_status && (
                <p className="mt-0.5 text-xs text-slate-600">
                  Status: <span className="text-slate-500">{event.old_status}</span>
                  {' -> '}
                  <span className="font-bold text-primary">{event.new_status}</span>
                </p>
              )}
              {event.notes && <p className="mt-1 text-xs text-slate-500">{event.notes}</p>}
            </div>
            <span className="flex-shrink-0 text-[10px] text-slate-400">{timeAgo(event.created_at)}</span>
          </div>
          {event.performed_by && (
            <p className="mt-2 text-[10px] text-slate-400">
              By: {event.performed_by.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoThumbnail({
  photo,
  isBroken,
  onError,
  onClick,
}: {
  photo: Photo;
  isBroken: boolean;
  onError: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 transition-all hover:ring-2 hover:ring-accent"
    >
      {!isBroken ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.storage_path}
            alt={`${photo.photo_type} evidence`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={onError}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-left">
            <span className="text-[10px] font-bold capitalize text-white">{photo.photo_type}</span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-accent">
          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>broken_image</span>
          <span className="mt-1 text-[10px] capitalize">{photo.photo_type}</span>
        </div>
      )}
      {photo.metadata?.quality && (
        <div className="absolute bottom-1 right-1">
          <span className={`rounded px-1 py-0.5 text-[8px] ${
            photo.metadata.quality === 'high' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {String(photo.metadata.quality)}
          </span>
        </div>
      )}
    </button>
  );
}

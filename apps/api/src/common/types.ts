export type Role = "admin" | "team";

export type Song = {
  id: number;
  youtubeVideoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration: string;
  playlistPosition: number;
  available: boolean;
};

export type ServiceSummary = {
  id: string;
  serviceDate: string;
  label: string;
  shareToken: string;
  itemCount: number;
};

export type ServiceItem = Song & {
  itemId: string;
  position: number;
  notes: string;
};

export type ServicePlan = ServiceSummary & { items: ServiceItem[] };

export type SyncState = {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
};

export type PlannerPayload = {
  songs: Song[];
  services: ServiceSummary[];
  selectedService: ServicePlan | null;
  sync: SyncState;
  playlistId: string;
  configured: boolean;
};

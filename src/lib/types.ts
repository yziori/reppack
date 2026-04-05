export interface Segment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export type SidecarStatus =
  | "idle"
  | "starting"
  | "ready"
  | "processing"
  | "error";

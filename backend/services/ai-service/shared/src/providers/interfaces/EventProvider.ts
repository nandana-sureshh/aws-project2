export interface AppEvent {
  source: string;
  detailType: string;
  detail: Record<string, unknown>;
  timestamp?: Date;
}

export interface EventProvider {
  publish(event: AppEvent): Promise<void>;

  publishBatch(events: AppEvent[]): Promise<void>;
}

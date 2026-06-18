import { EventProvider, AppEvent } from '../interfaces/EventProvider';

export class ConsoleEventProvider implements EventProvider {
  async publish(event: AppEvent): Promise<void> {
    const timestamp = (event.timestamp ?? new Date()).toISOString();
    const log = {
      timestamp,
      source: event.source,
      detailType: event.detailType,
      detail: event.detail,
    };
    process.stdout.write(`[EVENT] ${JSON.stringify(log)}\n`);
  }

  async publishBatch(events: AppEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

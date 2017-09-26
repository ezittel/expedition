import {RemotePlayEvent, RemotePlayEventBody, ClientID, ClientStatus} from './Events'

declare type EventHandler = (e: RemotePlayEvent) => any;

// ClientBase is a remote play client that is designed to communicate
// with like peers.
export abstract class ClientBase {
  protected id: ClientID;
  private handlers: EventHandler[];
  private clientStatusSet: {[id: string]: ClientStatus};

  constructor() {
    this.resetState();
  }

  setID(id: ClientID) {
    this.id = id;
  }

  resetState() {
    this.handlers = [];
    this.clientStatusSet = {};
  }

  abstract sendEvent(e: RemotePlayEventBody): void;

  protected handleMessage(e: RemotePlayEvent) {
    if (!e.event) {
      console.log('Malformed message: ' + e.toString());
      return;
    }

    // Error if we get a weird message type
    if (['STATUS', 'TOUCH', 'ACTION', 'ERROR'].indexOf(e.event.type) < 0) {
      this.publish({client: e.client, event: {type: 'ERROR', error: 'Received unknown message of type "' + e.event.type + '"'}});
      return;
    }

    // Dedupe messages to prevent unnecessary handler action
    if (e.event.type === 'STATUS') {
      if (!this.clientStatusSet[e.client]) {
        this.clientStatusSet[e.client] = {line: -1, waiting: null};
      }

      const s = this.clientStatusSet[e.client];
      if (s.line === e.event.status.line && s.waiting === e.event.status.waiting) {
        return;
      }
      this.clientStatusSet[e.client] = e.event.status;
    }

    this.publish(e);
  }

  publish(e: RemotePlayEvent) {
    for (const h of this.handlers) {
      h(e);
    }
  }

  subscribe(fn: EventHandler) {
    this.handlers.push(fn);
  }

  unsubscribe(fn: EventHandler) {
    const i = this.handlers.indexOf(fn);
    if(i > -1) {
      this.handlers.splice(i, 1);
    }
  }
}

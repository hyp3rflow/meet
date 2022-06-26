import type {
  ApiInitializeMessage,
  ApiParticipantMessage,
  ApiVoteMessage,
  ChannelMessage,
} from "./types.ts";

export class Server {
  subscribeMessages(
    roomId: number,
    onMessage: (message: ChannelMessage) => void,
  ) {
    const events = new EventSource(`/api/connect/${roomId}`);
    const listener = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as ChannelMessage;
      onMessage(msg);
    };
    events.addEventListener("message", listener);
    return {
      unsubscribe() {
        events.removeEventListener("message", listener);
      },
    };
  }

  sendVote(roomId: number, result: boolean) {
    const data: ApiVoteMessage = {
      kind: "vote",
      roomId,
      result,
    };
    fetch("/api/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  sendParticipant(roomId: number) {
    const data: ApiParticipantMessage = {
      kind: "participant",
      roomId,
    };
    fetch("/api/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  sendInitialize(roomId: number) {
    const data: ApiInitializeMessage = {
      kind: "initialize",
      roomId,
    };
    fetch("/api/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createRoom(name: string) {
    const res = await fetch("/api/create_room", {
      method: "POST",
      body: name,
    });
    const text = await res.text();
    if (!res.ok) {
      alert(text); // Nothing fancy
      throw new Error(text);
    }
    return text;
  }
}

export const server = new Server();

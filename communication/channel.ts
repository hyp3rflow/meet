import type {
  ChannelMessage,
  RoomInitializeChannelMessage,
  RoomIsTypingChannelMessage,
  RoomParticipantChannelMessage,
  RoomTextChannelMessage,
  RoomVoteChannelMessage,
  UserView,
} from "./types.ts";

export class RoomChannel {
  #channel: BroadcastChannel;

  constructor(roomId: number) {
    this.#channel = new BroadcastChannel(roomId.toString());
  }

  onMessage(handler: (message: ChannelMessage) => void) {
    const listener = (e: MessageEvent) => {
      handler(e.data);
    };
    this.#channel.addEventListener("message", listener);
    return {
      unsubscribe: () => {
        this.#channel.removeEventListener("message", listener);
      },
    };
  }

  close() {
    this.#channel.close();
  }

  sendVote(
    message: Omit<
      RoomVoteChannelMessage,
      "kind"
    >,
  ) {
    this.#channel.postMessage({
      kind: "vote",
      ...message,
    });
  }

  sendParticipant(message: Omit<RoomParticipantChannelMessage, "kind">) {
    this.#channel.postMessage({
      kind: "participant",
      ...message,
    });
  }

  sendInitialize(message: Omit<RoomInitializeChannelMessage, "kind">) {
    this.#channel.postMessage({
      kind: "initialize",
      ...message,
    });
  }
}

/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import { tw } from "@twind";
import twas from "twas";
import type { MessageView, UserView } from "../communication/types.ts";
import { server } from "@/communication/server.ts";

interface Vote extends UserView {
  result?: boolean;
}

export default function Chat(
  { roomId, roomName, user, isOwner, participants }: {
    roomId: number;
    roomName: string;
    isOwner: boolean;
    user: UserView;
    participants: UserView[];
  },
) {
  const [vote, setVote] = useState<Vote[]>(participants);

  useEffect(() => {
    Notification.requestPermission();

    const subscription = server.subscribeMessages(roomId, (msg) => {
      switch (msg.kind) {
        case "vote": {
          setVote((v) => {
            const index = v.findIndex((v) => v.name === msg.from.name);
            if (index !== -1) {
              v[index].result = msg.result;
            }
            return [...v];
          });
          break;
        }
        case "participant": {
          setVote((v) => {
            if (!v.some(v => v.name === msg.from.name)) {
              return [...v, msg.from];
            }
            return v;
          });
          break;
        }
        case "initialize": {
          setVote((v) => v.map((v) => ({ ...v, result: undefined })));
          break;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const send = (result: boolean) => {
    server.sendVote(roomId, result);
  };

  const initialize = () => {
    server.sendInitialize(roomId);
  }

  return (
    <>
      <div
        class={tw`w-1/2 h-2/3 rounded-2xl mb-5 pl-6 flex flex-col pt-4 pb-2`}
      >
        <div
          class={tw
            `h-8 flex-none pl-1 pr-7 mb-16 flex justify-between items-center`}
        >
          <a href="/">
            <img src="/arrow.svg" alt="Left Arrow" />
          </a>
          <div class={tw`font-medium text-lg`}>{roomName}</div>
          <div />
        </div>

        <div
          class={tw`flex-auto overflow-y-scroll`}
        >
          {vote.map((v) => <Vote data={v} />)}
        </div>
      </div>
      <div class={tw`w-1/2 h-16 flex-none rounded-full flex items-center`}>
        <ChatInput
          isOwner={isOwner}
          onSend={send}
          initialize={initialize}
        />
      </div>
    </>
  );
}

function ChatInput({ isOwner, onSend, initialize }: {
  isOwner: boolean;
  onSend: (result: boolean) => void;
  initialize: () => void;
}) {
  return (
    <div
      class={tw
        `block mx-6 w-full bg-transparent outline-none focus:text-gray-700`}
    >
      <button
        onClick={() => onSend(true)}
        class={tw`bg-green-400 py-2 px-4 rounded-full mr-2`}
      >
        👍🏼 Agree :)
      </button>
      <button
        onClick={() => onSend(false)}
        class={tw`bg-red-400 py-2 px-4 rounded-full`}
      >
        👎🏻 Disagree :(
      </button>
      {isOwner && 
      <button
        onClick={initialize}
        class={tw`bg-gray-200 py-2 px-4 rounded-full`}
      >
        Initialize!
      </button>}
    </div>
  );
}

function Vote({ data }: { data: Vote }) {
  return (
    <div class={tw`flex mb-4.5`}>
      <img
        src={data.avatarUrl}
        alt={`${data.name}'s avatar`}
        class={tw`mr-4 w-9 h-9 rounded-full`}
      />
      <div>
        <p class={tw`flex items-baseline mb-1.5`}>
          <span class={tw`mr-2 font-bold`}>
            {data.name}
          </span>
        </p>
        <p class={tw`text-sm text-gray-800`}>
          {data.result != null && (data.result
            ? (
              <div class={tw`bg-green-400 py-2 px-4 rounded-full mr-2`}>
                👍🏼 Agree :)
              </div>
            )
            : (
              <div class={tw`bg-red-400 py-2 px-4 rounded-full mr-2`}>
                👎🏻 Disagree :(
              </div>
            ))}
        </p>
      </div>
    </div>
  );
}

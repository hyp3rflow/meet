/** @jsx h */
import { h } from "preact";
import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { databaseLoader } from "@/communication/database.ts";
import Chat from "@/islands/Chat.tsx";
import type { MessageView, UserView } from "@/communication/types.ts";
import { Page } from "@/helpers/Page.tsx";
import { RoomChannel } from "../communication/channel.ts";

interface Data {
  roomName: string;
  isOwner: boolean;
  participants: UserView[];
  user: UserView;
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  // Get cookie from request header and parse it
  const accessToken = getCookies(req.headers)["meet_token"];
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const database = await databaseLoader.getInstance();
  const user = await database.getUserByAccessTokenOrThrow(accessToken);
  if (isNaN(+ctx.params.room)) {
    return new Response("Invalid room id", { status: 400 });
  }
  const participants = await database.updateRoomParticipants({roomId: +ctx.params.room, userId: user.userId});
  const channel = new RoomChannel(+ctx.params.room);
  channel.sendParticipant({
    from: {
      name: user.userName,
      avatarUrl: user.avatarUrl,
    }
  });
  const { name, owner } = await database.getRoomInfo(+ctx.params.room);
  return ctx.render({
    roomName: name,
    isOwner: owner === user.userId,
    participants,
    user: {
      name: user.userName,
      avatarUrl: user.avatarUrl,
    },
  });
};

export default function Room({ data, params }: PageProps<Data>) {
  return (
    <Page>
      <Chat
        roomId={+params.room}
        roomName={data.roomName}
        isOwner={data.isOwner}
        participants={data.participants}
        user={data.user}
      />
    </Page>
  );
}

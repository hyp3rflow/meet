import { HandlerContext } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { databaseLoader } from "@/communication/database.ts";
import { RoomChannel } from "@/communication/channel.ts";
import { ApiSendMessage } from "@/communication/types.ts";

export async function handler(
  req: Request,
  _ctx: HandlerContext,
): Promise<Response> {
  const accessToken = getCookies(req.headers)["meet_token"];
  if (!accessToken) {
    return new Response("Not signed in", { status: 401 });
  }
  const database = await databaseLoader.getInstance();
  const user = await database.getUserByAccessTokenOrThrow(accessToken);
  const data = (await req.json()) as ApiSendMessage;
  const channel = new RoomChannel(data.roomId);
  const from = {
    name: user.userName,
    avatarUrl: user.avatarUrl,
  };

  switch (data.kind) {
    case "vote": {
      channel.sendVote({
        result: data.result,
        from,
      });
      break;
    }
    case "participant": {
      channel.sendParticipant({
        from,
      });
      break;
    }
    case "initialize": {
      channel.sendInitialize({
        from,
      });
      break;
    }
  }
  channel.close();

  return new Response("OK");
}

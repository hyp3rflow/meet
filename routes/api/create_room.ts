import { Handlers } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { databaseLoader } from "@/communication/database.ts";

export const handler: Handlers = {
  async POST(req, _ctx) {
    const name = await req.text();
    const accessToken = getCookies(req.headers)["meet_token"];
    if (!accessToken) {
      return new Response("Not signed in", { status: 401 });
    }
    const database = await databaseLoader.getInstance();
    const { userId } = await database.getUserByAccessTokenOrThrow(accessToken);
    const roomId = await database.ensureRoom({ name, userId });

    return new Response(roomId, {
      status: 201,
    });
  },
};

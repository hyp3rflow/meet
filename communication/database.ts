import { ResourceLoader } from "../helpers/loader.ts";
import * as postgres from "$postgres";
import * as supabase from "supabase";
import type { MessageView, UserView } from "./types.ts";

export interface DatabaseUser {
  userId: number;
  userName: string;
  avatarUrl: string;
}

export class Database {
  #client: supabase.SupabaseClient;

  constructor(client?: supabase.SupabaseClient) {
    this.#client = client ?? supabase.createClient(
      Deno.env.get("SUPABASE_API_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
  }

  async insertUser(user: DatabaseUser & { accessToken: string }) {
    const { error } = await this.#client
      .from("users")
      .upsert([
        {
          id: user.userId,
          username: user.userName,
          avatar_url: user.avatarUrl,
          access_token: user.accessToken,
        },
      ], { returning: "minimal" });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getUserByAccessTokenOrThrow(
    accessToken: string,
  ): Promise<DatabaseUser> {
    const user = await this.getUserByAccessToken(accessToken);
    if (user == null) {
      throw new Error("Could not find user with access token.");
    }
    return user;
  }

  async getUserByAccessToken(
    accessToken: string,
  ): Promise<DatabaseUser | undefined> {
    const { data, error } = await this.#client
      .from("users")
      .select("id,username,avatar_url")
      .eq("access_token", accessToken);
    if (error) {
      throw new Error(error.message);
    }
    if (data.length === 0) {
      return undefined;
    }
    return {
      userId: data[0].id,
      userName: data[0].username,
      avatarUrl: data[0].avatar_url,
    };
  }

  async getRooms() {
    const { data, error } = await this.#client.from("rooms_with_activity")
      .select(
        "id,name,last_message_at,username,participants",
      );
    if (error) {
      throw new Error(error.message);
    }
    return data.map((d) => ({
      roomId: d.id,
      name: d.name,
      lastMessageAt: d.last_message_at,
      username: d.username,
      participants: d.participants ?? {},
    }));
  }

  async getRoomInfo(roomId: number): Promise<{ name: string; owner: number }> {
    const { data, error } = await this.#client.from("rooms")
      .select("name,user_id")
      .eq("id", roomId);
    if (error) {
      throw new Error(error.message);
    }
    return { name: data[0].name, owner: data[0].user_id };
  }

  async getRoomParticipants(roomId: number): Promise<UserView[]> {
    const { data, error } = await this.#client.from("rooms").select(
      "participants",
    ).eq("id", roomId);
    if (error) {
      throw new Error(error.message);
    }
    return Promise.all(
      Object.entries(data[0]?.participants ?? {}).filter(([, v]) => v).map(
        async ([k, _]) => {
          const { data, error } = await this.#client.from("users").select(
            "username,avatar_url",
          ).eq("id", +k);
          if (error) {
            throw new Error(error.message);
          }
          return { name: data[0].username, avatarUrl: data[0].avatar_url };
        },
      ),
    );
  }

  async updateRoomParticipants(
    { roomId, userId }: { roomId: number; userId: number },
  ) {
    const { data, error } = await this.#client.from("rooms").select(
      "participants",
    ).eq("id", roomId);
    if (error) {
      throw new Error(error.message);
    }
    const participants = data[0].participants ?? {};
    if (!participants[userId]) {
      const { error } = await this.#client.from("rooms").update({
        participants: { ...participants, [userId]: true },
      }).eq("id", roomId);
      if (error) {
        throw new Error(error.message);
      }
    }
    return { ...participants, [userId]: true };
  }

  async ensureRoom({ name, userId }: { name: string; userId: number }) {
    const insert = await this.#client.from("rooms").insert([{
      name,
      user_id: userId,
      participants: { [userId]: true },
    }], {
      upsert: false,
      returning: "representation",
    });

    if (insert.error) {
      if (insert.error.code !== "23505") {
        throw new Error(insert.error.message);
      }
      const get = await this.#client.from("rooms").select("id").eq(
        "name",
        name,
      );
      if (get.error) {
        throw new Error(get.error.message);
      }
      return get.data[0].id;
    }

    return insert.data![0].id;
  }

  async insertMessage(
    message: { text: string; roomId: number; userId: number },
  ) {
    await this.#client
      .from("messages")
      .insert([{
        message: message.text,
        room: message.roomId,
        from: message.userId,
      }], { returning: "minimal" });
  }

  async getRoomMessages(roomId: number): Promise<MessageView[]> {
    const { data, error } = await this.#client
      .from("messages")
      .select("message,from(username,avatar_url),created_at")
      .eq("room", roomId);
    if (error) {
      throw new Error(error.message);
    }
    return data.map((m) => ({
      message: m.message,
      from: {
        name: m.from.username,
        avatarUrl: m.from.avatar_url,
      },
      createdAt: m.created_at,
    }));
  }
}

export const databaseLoader = new ResourceLoader<Database>({
  async load() {
    // automatically create the database schema on startup
    const client = new postgres.Client({
      hostname: getEnvOrThrow("SUPABASE_DB_HOSTNAME"),
      port: Deno.env.get("SUPABASE_DB_PORT") ?? 5432,
      user: Deno.env.get("SUPABASE_DB_USER") ?? "postgres",
      password: getEnvOrThrow("SUPABASE_DB_PASSWORD"),
      database: Deno.env.get("SUPABASE_DB_NAME") ?? "postgres",
    });
    await client.connect();
    await client.queryArray(`
create table if not exists users (
  id integer generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique,
  avatar_url text,
  access_token text
);

create table if not exists rooms (
  id integer generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text unique not null
);

create table if not exists messages (
  id integer generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  message text,
  "from" integer references users (id),
  "room" integer references rooms (id)
);

create or replace view rooms_with_activity
as select
  rooms.id as id,
  rooms.name as name,
  max(messages.created_at) as last_message_at,
  users.username as username,
  rooms.participants as participants
from rooms
left join messages on messages.room = rooms.id
left join users on users.id = rooms.user_id
group by rooms.id, users.username
order by last_message_at desc nulls last;
`);
    await client.end();
    return Promise.resolve(new Database());

    function getEnvOrThrow(name: string) {
      const value = Deno.env.get(name);
      if (value == null) {
        throw new Error(`Missing env variable: ${name}`);
      }
      return value;
    }
  },
});

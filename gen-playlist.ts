import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs";
import _ from "lodash";

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
}

const PLAYLIST_ID = process.env.PLAYLIST_ID as string;
const TOKEN = process.env.SPOTIFY as string;
if (!PLAYLIST_ID || !TOKEN) {
  throw new Error("Gimmie the juice");
}

const addToPlaylistOpts = (
  playlistId: string,
  trackIds: string[]
): AxiosRequestConfig => ({
  method: "post",
  baseURL: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
  data: { uris: trackIds.map((id) => `spotify:track:${id}`) },
});

async function addToPlaylist(ids: string[]): Promise<void> {
  try {
    const chunks = _.chunk(ids, 99);
    for (const chunk of chunks) {
      const resp = await axios(addToPlaylistOpts(PLAYLIST_ID, chunk));
      console.log("ok", resp.status);
    }
  } catch (e) {
    const resp: AxiosResponse = e.response;
    if (!resp) {
      console.log(e);
      console.log(e.code);
      console.log(e.request);
      throw "bye";
    }

    if (resp.status === 429) {
      const afterTime = resp.headers["retry-after"];
      console.log("Rate limit until: ", afterTime);
      await sleep(afterTime);
      return addToPlaylist(ids);
    }

    console.log("big fail", resp);
    throw resp;
  }
}

addToPlaylist(JSON.parse(fs.readFileSync("./out/trackIds.json", "utf-8")));

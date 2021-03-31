import fs from "fs";
import { artists } from "./artists";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { ids } from "./fun/valid_ids";
import _ from "lodash";

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
}

const TOKEN = `XXXX`;

const searchOpts = (artist: string): AxiosRequestConfig => ({
  method: "get",
  baseURL: "https://api.spotify.com/v1/search",
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
  params: {
    q: artist,
    type: "artist",
  },
});

const followOpts = (artists: string[]): AxiosRequestConfig => ({
  method: "put",
  baseURL: "https://api.spotify.com/v1/me/following",
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
  params: {
    type: "artist",
  },
  data: { ids: artists },
});

type ArtistResp = { ok: boolean; data: any; originalName: string };

const searchArtist = async (artistName: string): Promise<ArtistResp> => {
  try {
    const resp = await axios(searchOpts(artistName));
    const foundName: string | null = resp.data?.artists?.items[0]?.name;
    if (foundName?.toLowerCase() !== artistName.toLocaleLowerCase()) {
      console.warn(`Search mismatch: ${foundName} !== ${artistName}`);
      return {
        ok: false,
        data: resp.data?.artists?.items[0],
        originalName: artistName,
      };
    } else {
      console.log(`Match: ${foundName}`);
      return {
        ok: true,
        data: resp.data?.artists?.items[0],
        originalName: artistName,
      };
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
      console.log("Rate limit until: ", resp.headers["retry-after"]);
      await sleep(resp.headers["Retry-After"]);
      return searchArtist(artistName);
    }

    throw resp;
  }
};
async function fetchArtists() {
  const out: ArtistResp[] = [];
  for (const artist of artists) {
    out.push(await searchArtist(artist));
  }

  const betterOut = out.map((d) => ({
    ...d,
    data: { id: d.data?.id, name: d.data?.name },
  }));

  fs.writeFileSync(
    "./out/valid.json",
    JSON.stringify(
      betterOut.filter((d) => d.ok),
      null,
      2
    )
  );
  fs.writeFileSync(
    "./out/invalid.json",
    JSON.stringify(
      betterOut.filter((d) => !d.ok),
      null,
      2
    )
  );
}

async function followArtists(ids: string[]): Promise<void> {
  try {
    const chunks = _.chunk(ids, 49);
    for (const chunk of chunks) {
      const resp = await axios(followOpts(chunk));
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
      return followArtists(ids);
    }

    console.log("big fail", resp);
    throw resp;
  }
}

followArtists(ids);

// fetchArtists();

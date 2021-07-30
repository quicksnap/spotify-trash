import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs";

type Pagination<T> = {
  href: string;
  items: T[];
  limit: number;
  next: null | string;
  offset: number;
  previous: null | string;
  total: number;
};

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
}

const PAGE_LIMIT = 50;
const TOKEN = process.env.SPOTIFY;
if (!TOKEN) {
  throw new Error("Gimmie the juice");
}
const likedAlbumsOpts = (offset: number): AxiosRequestConfig => ({
  method: "get",
  baseURL: "https://api.spotify.com/v1/me/albums",
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
  params: {
    limit: PAGE_LIMIT,
    offset,
  },
});

const getLikedAlbums = async (
  offset: number,
  prevData: unknown[]
): Promise<unknown> => {
  try {
    const resp = await axios.request<Pagination<unknown>>(
      likedAlbumsOpts(offset)
    );
    console.log("OK");
    const newItems = resp.data.items;

    if (resp.data.items.length === 0) {
      return prevData;
    }

    return getLikedAlbums(offset + PAGE_LIMIT, [...prevData, ...newItems]);
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
      return getLikedAlbums(offset, prevData);
    }

    throw resp;
  }
};

async function snatchAlbums() {
  const out = await getLikedAlbums(0, []);
  fs.writeFileSync("./out/albums.json", JSON.stringify(out, null, 2));
}

snatchAlbums();

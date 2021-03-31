import fs from "fs";
import { artists } from "./artists";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { ids } from "./fun/valid_ids";
import _ from "lodash";

const albums: any[] = JSON.parse(
  fs.readFileSync("./out/albums.json", { encoding: "utf-8" })
);

const shuffled = _.shuffle(albums);

const trackIds = [];

while (trackIds.length < 10_000) {
  const idx = trackIds.length;
  const tracks: any = shuffled[idx % shuffled.length].album.tracks.items;
  trackIds.push(tracks[_.random(0, tracks.length - 1)].id);
}

fs.writeFileSync("./out/trackIds.json", JSON.stringify(trackIds, null, 2));

import { Connector, Category } from "./types";

// Images
import unsplash from "./images/unsplash";
import pexels from "./images/pexels";
import pixabay from "./images/pixabay";
import openverse from "./images/openverse";
import wikimedia from "./images/wikimedia";

// Videos
import youtube from "./videos/youtube";
import vimeo from "./videos/vimeo";
import mixkit from "./videos/mixkit";
import coverr from "./videos/coverr";

// GIFs
import giphy from "./gifs/giphy";
import tenor from "./gifs/tenor";
import gifer from "./gifs/gifer";
import gifcities from "./gifs/gifcities";

// 3D Models
import sketchfab from "./models3d/sketchfab";
import thingiverse from "./models3d/thingiverse";
import free3d from "./models3d/free3d";
import archive3d from "./models3d/archive3d";

// Texts
import wikipedia from "./texts/wikipedia";
import openalex from "./texts/openalex";
import etymonline from "./texts/etymonline";
import treccani from "./texts/treccani";

const all: Connector[] = [
  unsplash, pexels, pixabay, openverse, wikimedia,
  youtube, vimeo, mixkit, coverr,
  giphy, tenor, gifer, gifcities,
  sketchfab, thingiverse, free3d, archive3d,
  wikipedia, openalex, etymonline, treccani,
];

export function getConnectors(category?: Category): Connector[] {
  if (!category) return all;
  return all.filter((c) => c.category === category);
}

export function listSources(): Record<Category, { name: string; type: string }[]> {
  const result: any = {};
  for (const c of all) {
    if (!result[c.category]) result[c.category] = [];
    result[c.category].push({ name: c.name, type: c.type });
  }
  return result;
}

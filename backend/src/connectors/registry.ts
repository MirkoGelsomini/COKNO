import { Connector, Category } from "./types";

// Images
import unsplash from "./images/unsplash";
import pexels from "./images/pexels";
import pixabay from "./images/pixabay";
import openverse from "./images/openverse";
import wikimedia from "./images/wikimedia";
import morguefile from "./images/morguefile";
import stocksnap from "./images/stocksnap";
import nasa from "./images/nasa";
import loc from "./images/loc";
import met from "./images/met";
import artstation from "./images/artstation";
import flickr from "./images/flickr";
import europeana from "./images/europeana";
import smithsonian from "./images/smithsonian";
import dpla from "./images/dpla";
import deviantart from "./images/deviantart";
import burst from "./images/burst";
import freeimages from "./images/freeimages";
import freepik from "./images/freepik";
import behance from "./images/behance";

// Videos
import youtube from "./videos/youtube";
import vimeo from "./videos/vimeo";
import mixkit from "./videos/mixkit";
import coverr from "./videos/coverr";
import pexelsVideos from "./videos/pexels_videos";
import pixabayVideos from "./videos/pixabay_videos";
import wikimediaVideos from "./videos/wikimedia_videos";
import ted from "./videos/ted";
import videvo from "./videos/videvo";
import pbs from "./videos/pbs";
import khanacademy from "./videos/khanacademy";
import mitocw from "./videos/mitocw";
import rumble from "./videos/rumble";
import reuters from "./videos/reuters";
import coursera from "./videos/coursera";
import pond5 from "./videos/pond5";
import academicearth from "./videos/academicearth";
import bbc from "./videos/bbc";
import crashcourse from "./videos/crashcourse";
import gettyVideos from "./videos/getty_videos";

// GIFs
import giphy from "./gifs/giphy";
import tenor from "./gifs/tenor";
import gifer from "./gifs/gifer";
import gifcities from "./gifs/gifcities";
import imgur from "./gifs/imgur";
import reddit from "./gifs/reddit";
import pixabayGifs from "./gifs/pixabay_gifs";
import imgflip from "./gifs/imgflip";
import wifflegif from "./gifs/wifflegif";
import gifsec from "./gifs/gifsec";
import gifimage from "./gifs/gifimage";
import gifgifs from "./gifs/gifgifs";
import tumblr from "./gifs/tumblr";
import reactiongifs from "./gifs/reactiongifs";
import animatedimages from "./gifs/animatedimages";
import makeagif from "./gifs/makeagif";
import dribbble from "./gifs/dribbble";
import lottiefiles from "./gifs/lottiefiles";
import motionelements from "./gifs/motionelements";

// 3D Models
import sketchfab from "./models3d/sketchfab";
import thingiverse from "./models3d/thingiverse";
import free3d from "./models3d/free3d";
import archive3d from "./models3d/archive3d";
import polyhaven from "./models3d/polyhaven";
import myminifactory from "./models3d/myminifactory";
import cults3d from "./models3d/cults3d";
import printables from "./models3d/printables";
import grabcad from "./models3d/grabcad";
import makerworld from "./models3d/makerworld";
import stlfinder from "./models3d/stlfinder";
import yobi3d from "./models3d/yobi3d";
import turbosquid from "./models3d/turbosquid";
import cgtrader from "./models3d/cgtrader";
import thangs from "./models3d/thangs";
import warehouse3d from "./models3d/warehouse3d";
import blenderswap from "./models3d/blenderswap";
import pinshape from "./models3d/pinshape";
import youmagine from "./models3d/youmagine";
import nih3d from "./models3d/nih3d";

// Texts
import wikipedia from "./texts/wikipedia";
import openalex from "./texts/openalex";
import etymonline from "./texts/etymonline";
import treccani from "./texts/treccani";
import conceptnet from "./texts/conceptnet";
import gutenberg from "./texts/gutenberg";
import internetarchive from "./texts/internetarchive";
import arxiv from "./texts/arxiv";
import pubmed from "./texts/pubmed";
import semanticscholar from "./texts/semanticscholar";
import openlibrary from "./texts/openlibrary";
import wikisource from "./texts/wikisource";
import simplewiki from "./texts/simplewiki";
import doaj from "./texts/doaj";
import merriamwebster from "./texts/merriamwebster";
import core from "./texts/core";
import cambridge from "./texts/cambridge";
import stanfordPhilosophy from "./texts/stanford_philosophy";
import base from "./texts/base";
import doab from "./texts/doab";

const all: Connector[] = [
  // Images (20)
  unsplash, pexels, pixabay, openverse, wikimedia, morguefile, stocksnap,
  nasa, loc, met, artstation, flickr, europeana, smithsonian, dpla,
  deviantart, burst, freeimages, freepik, behance,

  // Videos (20)
  youtube, vimeo, mixkit, coverr,
  pexelsVideos, pixabayVideos, wikimediaVideos, ted, videvo, pbs, khanacademy, mitocw,
  rumble, reuters, coursera, pond5, academicearth, bbc, crashcourse, gettyVideos,

  // GIFs (19)
  giphy, tenor, gifer, gifcities, imgur, reddit, pixabayGifs,
  imgflip, wifflegif, gifsec, gifimage, gifgifs,
  tumblr, reactiongifs, animatedimages, makeagif, dribbble, lottiefiles, motionelements,

  // 3D Models (20)
  sketchfab, thingiverse, free3d, archive3d,
  polyhaven, myminifactory, cults3d, printables, grabcad, makerworld,
  stlfinder, yobi3d, turbosquid, cgtrader, thangs,
  warehouse3d, blenderswap, pinshape, youmagine, nih3d,

  // Texts (20)
  wikipedia, openalex, etymonline, treccani,
  conceptnet, gutenberg, internetarchive, arxiv, pubmed, semanticscholar,
  openlibrary, wikisource, simplewiki, doaj, merriamwebster, core,
  cambridge, stanfordPhilosophy, base, doab,
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

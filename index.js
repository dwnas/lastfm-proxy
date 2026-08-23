import Config from "./config.json" with { type: "json" };
import Fastify from "fastify";
import cors from '@fastify/cors'

const { token, username, port} = Config;

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  // put your options here
})

async function guess_playtime(json) {
  // get last song length and endtime (which is current song start time probably)
  const last_song_playtime = json.recenttracks.track[1]["date"]["uts"];
  const last_track = json.recenttracks.track[1];
  let last_song_info;
  let current_song_info;

  const last_song_mbid = last_track.mbid;
  if (!last_song_mbid) {
    last_song_info = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${token}&artist=${last_track.artist["#text"].replace(/ /g, '+')}&track=${last_track.name.replace(/ /g, '+')}&format=json`);
  }
  else {
    last_song_info = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${token}&mbid=${last_song_mbid}&format=json`);
  }

  const last_song_length = (await last_song_info.json()).track.duration;
  const last_song_endtime = parseInt(last_song_playtime) + parseInt(last_song_length / 1000);

  // get current song length
  const current_song_mbid = json.recenttracks.track[0].mbid;
  if (!current_song_mbid) {
    current_song_info = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${token}&artist=${json.recenttracks.track[0].artist["#text"].replace(/ /g, '+')}&track=${json.recenttracks.track[0].name.replace(/ /g, '+')}&format=json`);
  }
  else {
    current_song_info = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${token}&mbid=${current_song_mbid}&format=json`);
  }

  const current_song_length = (await current_song_info.json()).track.duration / 1000;
  const listening_time = Date.now() / 1000 - last_song_endtime;

  if (!last_song_length || !current_song_length || listening_time > current_song_length) {
    return null;
  }

  return {"listening_time": listening_time, "song_length": current_song_length};
}

async function extractNP(json) {
  const track = json.recenttracks.track[0];
  const isNowPlaying = track["@attr"] && track["@attr"].nowplaying === "true";

  if (!isNowPlaying) {
    return {};
  }

  const playtime = await guess_playtime(json);


  const data = {
    playtime: playtime || null,
    name: track.name,
    artist: track.artist["#text"],
    album: track.album["#text"],
    images: track.image,
    url: track.url,
  }

  return isNowPlaying ? data : {};
}



// Declare a route
fastify.get("/", async function (request, reply) {
  const resp = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${token}&format=json`,
  );
  const data = await extractNP(await resp.json());
  
  reply.send(data);
});

// Run the server!
fastify.listen({ port }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server is now listening on ${address}`);
});

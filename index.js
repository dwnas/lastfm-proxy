import Config from "./config.json" with { type: "json" };
import Fastify from "fastify";

const { token, username, port} = Config;

const fastify = Fastify({
  logger: true,
});

function extractNP(json) {
  const track = json.recenttracks.track[0];
  const isNowPlaying = track["@attr"] && track["@attr"].nowplaying === "true";

  if (!isNowPlaying) {
    return {};
  }

  const data = {
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
  const data = extractNP(await resp.json());



  reply.send(data);
});

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});

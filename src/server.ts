import index from "../index.html";

const server = Bun.serve({
  development: true,
  routes: {
    "/": index,
  },
});

console.log(`Monster Run running at ${server.url}`);

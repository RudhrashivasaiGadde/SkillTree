const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataRoot = path.join(root, "data", "profiles");
const startPort = Number(process.env.PORT || 4173);
const maxPort = startPort + 10;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function send(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
}

function sendJson(response, status, body) {
  send(response, status, JSON.stringify(body, null, 2), "application/json; charset=utf-8");
}

function safeProfileId(rawId) {
  return String(rawId || "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "") || "default";
}

function profilePath(profileId) {
  return path.join(dataRoot, `${safeProfileId(profileId)}.json`);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleApi(request, response, url) {
  const match = url.pathname.match(/^\/api\/profiles\/([^/]+)$/);
  if (!match) {
    sendJson(response, 404, { error: "API route not found" });
    return true;
  }

  const id = safeProfileId(decodeURIComponent(match[1]));
  const filePath = profilePath(id);

  if (request.method === "GET") {
    fs.readFile(filePath, "utf8", (error, content) => {
      if (error) {
        sendJson(response, 404, { profileId: id, profile: { name: "Your Profile" }, skills: [], projects: [], certificates: [] });
        return;
      }
      send(response, 200, content, "application/json; charset=utf-8");
    });
    return true;
  }

  if (request.method === "PUT") {
    try {
      const body = await readRequestBody(request);
      const parsed = JSON.parse(body || "{}");
      const payload = {
        ...parsed,
        profileId: id,
        savedAt: new Date().toISOString(),
      };
      fs.mkdirSync(dataRoot, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
      sendJson(response, 200, { ok: true, profileId: id });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid profile data" });
    }
    return true;
  }

  sendJson(response, 405, { error: "Method not allowed" });
  return true;
}

function serveFile(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(response, 200, content, mimeTypes[ext] || "application/octet-stream");
  });
}

function listen(port) {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    serveFile(request, response, url);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < maxPort) {
      listen(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    fs.writeFileSync(path.join(root, ".local-server.json"), JSON.stringify({ port }, null, 2));
    console.log(`SkillTree running at http://127.0.0.1:${port}`);
  });
}

listen(startPort);

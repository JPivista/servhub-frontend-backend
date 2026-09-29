const path = require("path");
const dotenv = require("dotenv");

for (const envFile of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
]) {
  dotenv.config({ path: envFile, override: false });
}

const https = require("https");
const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/dbConnect");
const { seed } = require("./data/seed");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const deleteRequestRoutes = require("./routes/deleteRequestRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const materialRequestRoutes = require("./routes/materialRequestRoutes");
const materialRoutes = require("./routes/materialRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = dbConnect().then(async () => {
      await seed();
    });
  }
  return dbReady;
}

const LOGO_URL = "https://wf.servhub.io/brand/servhub-v101-logo.png";

app.get("/api/v1/brand/logo", (req, res) => {
  https
    .get(LOGO_URL, (upstream) => {
      if (upstream.statusCode !== 200) {
        res.status(502).end();
        upstream.resume();
        return;
      }
      res.setHeader("Content-Type", upstream.headers["content-type"] || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      upstream.pipe(res);
    })
    .on("error", () => {
      if (!res.headersSent) res.status(502).end();
    });
});

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api") || req.path === "/api/v1/brand/logo") return next();
  try {
    await ensureDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/delete-requests", deleteRequestRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/material-requests", materialRequestRoutes);
app.use("/api/v1/materials", materialRoutes);
app.use("/api/v1/audits", auditRoutes);

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok" });
});

function attachClient(app) {
  if (process.env.VERCEL) return null;

  const buildDir = path.resolve(__dirname, "../../build");
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    app.use(express.static(buildDir));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.sendFile(path.join(buildDir, "index.html"), (err) => next(err));
    });
    return null;
  }

  const { createProxyMiddleware } = require("http-proxy-middleware");
  const webPort = process.env.WEB_DEV_PORT || 3001;
  const clientProxy = createProxyMiddleware((pathname) => !pathname.startsWith("/api"), {
    target: `http://127.0.0.1:${webPort}`,
    changeOrigin: true,
    ws: true,
    logLevel: "silent",
    onError(err, req, res) {
      if (!res || typeof res.writeHead !== "function" || res.headersSent) return;
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ServHub UI is starting. Refresh in a moment.");
    },
  });
  app.use(clientProxy);
  return clientProxy;
}

const clientProxy = attachClient(app);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

const PORT = Number(process.env.PORT) || 7001;

if (!process.env.VERCEL) {
  ensureDb()
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`ServHub running on http://localhost:${PORT}`);
      });
      if (clientProxy?.upgrade) {
        server.on("upgrade", clientProxy.upgrade);
      }
    })
    .catch((error) => {
      console.error("Failed to start ServHub:", error.message);
      process.exit(1);
    });
}

module.exports = app;

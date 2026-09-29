const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const root = path.resolve(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;
const webPort = process.env.WEB_DEV_PORT || 3001;

if (isProd) {
  require("../api/_lib/app");
} else {
  const children = [];
  let shuttingDown = false;

  function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) child.kill("SIGTERM");
    }
    process.exit(code);
  }

  function run(command, extraEnv) {
    const child = spawn(command, {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...extraEnv },
    });
    children.push(child);
    child.on("exit", (code) => {
      if (shuttingDown) return;
      shutdown(code || 0);
    });
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  run("node api/_lib/app.js", {
    PORT: String(port),
    WEB_DEV_PORT: String(webPort),
  });

  run("react-scripts start", {
    PORT: String(webPort),
    BROWSER: "none",
    HOST: "127.0.0.1",
    WDS_SOCKET_HOST: "localhost",
    WDS_SOCKET_PORT: String(port),
    DANGEROUSLY_DISABLE_HOST_CHECK: "true",
  });

  console.log(`ServHub: open http://localhost:${port}`);
}

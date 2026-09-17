import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const FASTAPI_PORT = 8080;

app.use(express.json({ limit: "10mb" }));

// Launch FastAPI backend process in background on port 8080
let fastApiProcess: any = null;
try {
  fastApiProcess = spawn("python3", ["-m", "uvicorn", "app.main:app", "--port", `${FASTAPI_PORT}`, "--host", "127.0.0.1"], {
    cwd: process.cwd(),
    env: { ...process.env, PYTHONPATH: process.cwd() },
    stdio: "inherit"
  });

  fastApiProcess.on("error", (err: any) => {
    console.warn("[FastAPI Process Error]:", err.message);
  });
} catch (e: any) {
  console.warn("[FastAPI Spawn Warning]:", e.message);
}

// Clean up child process on exit
process.on("exit", () => {
  if (fastApiProcess) fastApiProcess.kill();
});

// Helper to load JSON files safely
function loadJsonFile(filePath: string, fallback: any = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

// REST Endpoints Implementation
app.get("/health", async (req: Request, res: Response) => {
  const meta = loadJsonFile(path.join(process.cwd(), "models", "metadata.json"));
  const modelExists = fs.existsSync(path.join(process.cwd(), "models", "audience_pipeline.joblib"));
  res.json({
    status: modelExists ? "healthy" : "degraded",
    model_loaded: modelExists,
    timestamp: new Date().toISOString()
  });
});

app.get("/info", (req: Request, res: Response) => {
  const meta = loadJsonFile(path.join(process.cwd(), "models", "metadata.json"));
  if (!meta || !meta.algorithm) {
    return res.status(503).json({ detail: "Model metadata not available" });
  }
  res.json(meta);
});

app.get("/segments", (req: Request, res: Response) => {
  const profiles = loadJsonFile(path.join(process.cwd(), "models", "cluster_profiles.json"), { segments: [] });
  res.json({
    total_users: profiles.total_users || 5000,
    n_clusters: (profiles.segments || []).length,
    segments: (profiles.segments || []).map((s: any) => ({
      cluster_id: s.cluster_id,
      segment_name: s.segment_name,
      user_count: s.user_count,
      percentage: s.percentage
    }))
  });
});

app.get("/segments/:cluster_id", (req: Request, res: Response) => {
  const clusterId = parseInt(req.params.cluster_id, 10);
  const profiles = loadJsonFile(path.join(process.cwd(), "models", "cluster_profiles.json"), { segments: [] });
  const segment = (profiles.segments || []).find((s: any) => s.cluster_id === clusterId);
  if (!segment) {
    return res.status(404).json({ detail: `Audience segment with cluster ID ${clusterId} not found.` });
  }
  res.json(segment);
});

// Direct fast python inference handler
function runPythonPredict(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", ["ml/predict_cli.py"], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONPATH: process.cwd() }
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => { stdout += data.toString(); });
    python.stderr.on("data", (data) => { stderr += data.toString(); });

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || stdout || `Process exited with code ${code}`));
      }
      try {
        const json = JSON.parse(stdout.trim());
        if (json.error) return reject(new Error(json.error));
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse prediction output: ${stdout}`));
      }
    });

    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();
  });
}

app.post("/predict", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // Input validation check
    if (typeof body.watch_time === "number" && body.watch_time < 0) {
      return res.status(422).json({ error: "Validation Error", detail: "watch_time cannot be negative" });
    }
    if (typeof body.completion_rate === "number" && (body.completion_rate < 0 || body.completion_rate > 1)) {
      return res.status(422).json({ error: "Validation Error", detail: "completion_rate must be between 0.0 and 1.0" });
    }

    const prediction = await runPythonPredict(body);
    res.json(prediction);
  } catch (e: any) {
    res.status(500).json({ error: "Prediction failed", message: e.message });
  }
});

app.post("/predict/batch", async (req: Request, res: Response) => {
  try {
    const viewers = req.body.viewers || req.body;
    if (!Array.isArray(viewers)) {
      return res.status(422).json({ error: "viewers must be an array" });
    }
    const result = await runPythonPredict(viewers);
    res.json({
      count: result.length || (result.results ? result.results.length : 0),
      results: result.results || result
    });
  } catch (e: any) {
    res.status(500).json({ error: "Batch prediction failed", message: e.message });
  }
});

app.get("/pca", (req: Request, res: Response) => {
  const pca = loadJsonFile(path.join(process.cwd(), "models", "pca_projection.json"));
  if (!pca || !pca.points) {
    return res.status(404).json({ detail: "PCA data not found" });
  }
  res.json(pca);
});

// Independent evaluation endpoints
app.get("/api/evaluation/results", (req: Request, res: Response) => {
  const results = loadJsonFile(path.join(process.cwd(), "evaluation", "results.json"));
  res.json(results);
});

app.get("/api/evaluation/report", (req: Request, res: Response) => {
  const reportPath = path.join(process.cwd(), "evaluation", "report.html");
  if (fs.existsSync(reportPath)) {
    res.sendFile(reportPath);
  } else {
    res.status(404).send("Evaluation report HTML has not yet been generated.");
  }
});

app.post("/api/evaluation/run", (req: Request, res: Response) => {
  exec("PYTHONPATH=. python3 evaluation/generate_report.py", { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: "Evaluation run failed", details: stderr || stdout });
    }
    const results = loadJsonFile(path.join(process.cwd(), "evaluation", "results.json"));
    res.json({
      message: "Independent evaluation completed successfully",
      output: stdout,
      results
    });
  });
});

// Interactive API Documentation Endpoint
app.get("/docs", (req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>OTT Audience Intelligence API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body style="margin:0; background:#0f172a;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`);
});

app.get("/openapi.json", (req: Request, res: Response) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "OTT Audience Intelligence & Behavioral Segmentation Service",
      version: "1.0.0",
      description: "Unsupervised machine learning service discovering natural viewer segments."
    },
    paths: {
      "/health": { get: { summary: "Health check", tags: ["Monitoring"], responses: { 200: { description: "Service status" } } } },
      "/info": { get: { summary: "Model intelligence and metadata", tags: ["Model Intelligence"], responses: { 200: { description: "Model spec" } } } },
      "/segments": { get: { summary: "List audience segments", tags: ["Audience Segments"], responses: { 200: { description: "Segments list" } } } },
      "/segments/{cluster_id}": { get: { summary: "Get segment detail by ID", tags: ["Audience Segments"], parameters: [{ name: "cluster_id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Segment profile" } } } },
      "/predict": { post: { summary: "Classify viewer behavior into segment", tags: ["Inference"], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { watch_time: { type: "number" }, session_duration: { type: "number" }, visit_frequency: { type: "integer" }, completion_rate: { type: "number" } } } } } }, responses: { 200: { description: "Prediction" } } } },
      "/predict/batch": { post: { summary: "Batch classification of viewers", tags: ["Inference"], responses: { 200: { description: "Batch results" } } } },
      "/pca": { get: { summary: "2D PCA coordinates", tags: ["Visualization"], responses: { 200: { description: "PCA scatter data" } } } }
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OTT Audience Intelligence Web & API Server running on port ${PORT}`);
  });
}

startServer();

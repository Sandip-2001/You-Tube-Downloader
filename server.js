const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const WebSocket = require("ws");
const path = require("path");
const app = express();
const PORT = 5001;
const WS_PORT = 5002;

app.use(cors());
app.use(express.json());

const wss = new WebSocket.Server({ port: WS_PORT });
let clients = new Set();

wss.on("connection", (ws) => {
  console.log("WebSocket Client Connected");
  clients.add(ws);

  ws.on("close", () => {
    console.log("Client Disconnected");
    clients.delete(ws);
  });
});

// Function to send progress updates to all connected clients
function sendProgress(progress) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ progress }));
    }
  });
}

// **1️⃣ Get Available Formats (with correct resolution)**
app.get("/formats", (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing video URL" });

  exec(`yt-dlp -F "${videoUrl}"`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: stderr });
    console.log("Printing stdout...........");
    console.log(stdout);
    const lines = stdout.split("\n");
    const formats = [];
    console.log("Printing lines...............");
    console.log(lines);
    console.log("..........................");
    lines.forEach((line) => {
      if (line.includes("mp4_dash") && line.includes("avc1")) {
        // const match = line.match(/^(\d+)\s+(\w+|\?)\s+(\d+x\d+|\d+p|\?p)?/);
        const match = line.match(
          /^(\d+)\s+(\w+|\?)\s+([\dx]+p?|\?)\s+.*\|\s*([\d.]+[KMGT]?iB)/
        );
        console.log(line);
        if (match) {
          formats.push({
            format_id: match[1], // Format ID
            extension: match[2], // File type (mp4, webm, etc.)
            resolution: match[3] || "Unknown", // Resolution (e.g., 360p, 720p)
            file_size: match[4],
          });
          console.log("file size is -->> " + match[4]);
        }
      }
    });

    res.json({ formats });
  });
});

app.post("/download", (req, res) => {
  const { url, format_id } = req.body;
  if (!url || !format_id)
    return res.status(400).json({ error: "Missing parameters" });
  const timestamp = Date.now();
  const outputFilePattern = `downloads/video_${format_id}_${timestamp}.%(ext)s`;
  const format = `bestaudio+${format_id}`;

  const command = `yt-dlp -f ${format} -o "${outputFilePattern}" "${url}" --progress-template "%(progress._percent_str)s"`;

  const process = exec(command);

  process.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("Raw Progress Output:", output); // Debugging

    const match = output.match(/(\d+(\.\d+)?)%/); // Captures percentages like "12.5%"
    if (match) {
      const progress = parseFloat(match[1]); // Extract percentage
      // console.log("Extracted Progress:", progress); // Debugging
      sendProgress(progress); // Send update to frontend
    }
  });

  process.stderr.on("data", (data) => {
    console.error("Error:", data);
  });

  process.on("exit", () => {
    fs.readdir("downloads", (err, files) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to read downloads directory" });

      const downloadedFile = files.find((file) =>
        file.includes(`video_${format_id}`)
      );
      if (!downloadedFile)
        return res.status(500).json({ error: "Downloaded file not found" });

      const downloadedFilePath = `downloads/${downloadedFile}`;
      res.json({
        success: true,
        file: `http://localhost:${PORT}/${downloadedFilePath}`,
      });
      // }
    });
  });
});

// **3️⃣ Serve Downloaded Files**
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

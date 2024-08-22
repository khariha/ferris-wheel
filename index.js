const express = require("express");
const http = require("http");
const { spawn } = require("child_process");

const { askModel } = require("./src/inference");

const app = express();
const port = 3005;

const server = http.createServer(app);
app.use(express.json());

app.get("/status", (_req, res) => {
    res.json({ status: "healthy" });
});

// Add the /chat endpoint
app.post("/chat", async (req, res) => {
    const { clientUUID, clientRequest } = req.body;
    if (clientUUID && clientRequest) {
        const answer = await askModel(clientUUID, clientRequest);
        res.json({ message: `The model says: ${answer}` });
    } else {
        res.status(400).json({ error: "No 'request' field provided" });
    }
});

server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);

    // Start MongoDB server
    const mongoProcess = spawn("mongod", [
        "--dbpath", "mongoDB",
        "--logpath", "mongoDB/mongod.log",  // Optional: specify a log file
        "--logappend",                      // Optional: append logs to the file
        "--quiet"                           // Suppresses all logging except errors
    ], { stdio: "inherit" });

    mongoProcess.on("error", (err) => {
        console.error("Failed to start MongoDB process:", err);
    });

    mongoProcess.on("exit", (code, signal) => {
        if (code !== null) {
            console.log(`MongoDB process exited with code ${code}`);
        } else {
            console.log(`MongoDB process was killed with signal ${signal}`);
        }
    });

    // Start the Chroma process after MongoDB process starts
    const chromaProcess = spawn("chroma", ["run", "--path", "chroma"], { stdio: "inherit" });

    chromaProcess.on("error", (err) => {
        console.error("Failed to start Chroma process:", err);
    });

    chromaProcess.on("exit", (code, signal) => {
        if (code !== null) {
            console.log(`Chroma process exited with code ${code}`);
        } else {
            console.log(`Chroma process was killed with signal ${signal}`);
        }
    });
});

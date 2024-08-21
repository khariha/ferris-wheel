const express = require("express");
const http = require("http");
const { spawn } = require("child_process"); // Import child_process to run shell commands

const { askModel } = require("./src/inference");

const app = express();
const port = 3005;

const server = http.createServer(app);
app.use(express.json());

app.get("/status", (req, res) => {
    res.json({ status: "healthy" });
});

// Add the /chat endpoint
app.post("/chat", async (req, res) => {
    const { clientUUID, clientRequest } = req.body; // Extract the 'request' field from the request body
    if (clientUUID && clientRequest) {

        const answer = await askModel(clientUUID, clientRequest); // Call the askModel function with the 'request' field value
        
        res.json({ message: `The model says: ${answer}`});
        
    } else {
        res.status(400).json({ error: "No 'request' field provided" });
    }
});

server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);

    // Run the Chroma command when the server starts
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

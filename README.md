# Ferris Wheel: An AI-Powered Agent Framework

**Ferris Wheel** is an AI-driven agent framework that employs recursive function calling, chain-of-thought processing, and Retrieval-Augmented Generation (RAG) for abstracted memory retrieval. This framework supports dynamic conversational experiences and provides robust, memory-enhanced responses by leveraging stored memories and contextual understanding in real-time.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Components](#components)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Configuration](#configuration)
- [Development Notes](#development-notes)
- [Contributing](#contributing)

---

## Overview

The Ferris Wheel framework is designed to manage complex, interactive user conversations by using recursive function calls and memory retrieval techniques. Its combination of **Recursive Function Calling**, **Chain of Thought (CoT) Processing**, and **Retrieval-Augmented Generation (RAG)** allows agents to recall context and make decisions that mimic intelligent conversational flow. This framework is optimized for applications requiring high memory recall, conversation personalization, and event/task management.

## Features

- **Recursive Function Calls**: Enables agents to revisit steps based on the conversation’s context until the final response is complete.
- **Chain of Thought Processing**: Breaks down complex instructions into actionable steps for efficient task completion.
- **Retrieval-Augmented Generation (RAG)**: Abstracts memory retrieval to add relevant context to responses using ChromaDB as a memory store.
- **Personalized Event Management**: Built-in capabilities to create, read, update, and delete events specific to each user.
- **Flexible Memory Storage**: Manages individual user memories, allowing agents to retrieve past interactions and conversations.
- **Adaptive Tools Selection**: Dynamically chooses and applies tools based on the user’s request and context.

## Architecture

The Ferris Wheel framework operates through a multi-layered architecture:

1. **Express Server (API Layer)**: Manages HTTP requests and provides endpoints for user interactions.
2. **Agent Layer**:
   - **Chain of Thought Processor**: Processes user queries and determines optimal steps.
   - **Event Management Agent**: Handles calendar and event-related tasks.
3. **Memory System (Cortex)**:
   - **Memory Abstraction**: Retrieves and stores conversational context and user-specific memories.
   - **ChromaDB**: Serves as a vector store for memory indexing and retrieval.
4. **MongoDB Storage**: Persistently stores conversation history and event details per client UUID.

### Core Technologies
- **Node.js** and **Express** for server and API management.
- **OpenAI** models for AI-based response generation.
- **ChromaDB** for memory retrieval and storage.
- **MongoDB** for storing event and conversation data.

## Components

### 1. **Core Agents**
   - **`askModel`**: The primary inference function, handling recursive calls to derive responses using memory retrieval and thought processing.
   - **`try_to_remember`**: A function designed to recall memories, retrieving past user interactions stored in the ChromaDB.
   - **`query_events_agent`**: Manages event-related requests, enabling creation, updating, retrieval, and deletion of user events.
   - **`suspend_thread`**: Ends a conversation thread when no further action is required.

### 2. **Memory Management**
   - **Cortex Memory System**: Abstracts memory through stored recollections and conversations.
   - **ChromaDB**: A vector-based database for optimized memory retrieval and sorting by relevance.

### 3. **Chain of Thought (CoT) Agent**
   - **inferChainOfThought**: Breaks down user queries into structured tasks, enabling the main model to process complex or multi-step actions.

### 4. **Event Management**
   - **Event CRUD Functions**: Provides functions to create, read, update, and delete calendar events using MongoDB.

## Usage

### Prerequisites
- **Node.js** (>=14.x)
- **MongoDB** (>=4.x)
- **ChromaDB** for memory storage
- **OpenAI API Key**: Required for AI-based responses.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ferris-wheel
   cd ferris-wheel
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   MONGO_URI=mongodb://127.0.0.1:27017/yourdatabase
   PORT=3005
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

### Endpoints

| Endpoint          | Method | Description                                                   |
|-------------------|--------|---------------------------------------------------------------|
| `/status`         | GET    | Checks the server health status.                              |
| `/chat`           | POST   | Sends a chat message to the agent framework for a response.   |

#### Example `/chat` Payload
```json
{
  "clientUUID": "12345",
  "clientRequest": "What events do I have tomorrow?"
}
```

### Sample Response
```json
{
  "message": "The model says: You have a meeting with John at 10 AM tomorrow."
}
```

## Configuration

- **MongoDB**: Ferris Wheel uses MongoDB as a persistent storage for conversation logs and user-specific events. The database connection details can be configured in the `.env` file.
- **ChromaDB**: Ensure that ChromaDB is running and accessible for memory retrieval. Ferris Wheel uses it to store and query conversation memories and context.

## Development Notes

1. **Recursive Calls Limiting**: `askModel` includes a loop counter to prevent excessive recursive calls. Adjust the limit as needed.
2. **Modular Agents**: Each agent is modular, allowing for easy customization or replacement of functionality.
3. **Logging**: The framework logs function calls and errors for traceability, which can be adjusted for verbosity in production.

## Contributing

We welcome contributions! To contribute:
1. Fork the repository.
2. Create a new branch.
3. Submit a pull request describing your changes.

---

Ferris Wheel is an evolving AI agent framework that leverages cutting-edge memory retrieval and structured processing. It offers developers a powerful toolkit for building intelligent, context-aware conversational systems with an emphasis on memory abstraction and recursive function handling.

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017/minatoDB";
let client;

const connectToDatabase = async () => {
    if (!client) {
        client = new MongoClient(uri); // No need to pass the deprecated options

        try {
            await client.connect();
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            process.exit(1); // Exit process with failure
        }
    }

    return client.db();
};

async function submitCortexConversation(clientUUID, messages) {
    const db = await connectToDatabase();
    const collection = db.collection('cortexConversations'); // Use or create a collection named 'cortexConversations'

    const conversationDocument = {
        clientUUID: clientUUID, // Tag the conversation with the client UUID
        messages: messages,     // Store the array of messages
        createdAt: new Date()   // Optional: Store the date and time of submission
    };

    try {
        const result = await collection.insertOne(conversationDocument);
        console.log('Conversation successfully submitted:', result.insertedId);
    } catch (err) {
        console.error('Error submitting conversation:', err);
    }
}

async function retrieveCortexConversations(clientUUID) {
    const db = await connectToDatabase();
    const collection = db.collection('cortexConversations');

    try {
        const conversations = await collection.find({ clientUUID }).toArray();
        console.log(`Found ${conversations.length} conversation(s) for client UUID: ${clientUUID}`);
        return conversations;
    } catch (err) {
        console.error('Error retrieving conversations:', err);
        return [];
    }
}

module.exports = { submitCortexConversation, retrieveCortexConversations };

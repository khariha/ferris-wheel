const { ChromaClient } = require("chromadb");
const client = new ChromaClient();
const crypto = require('crypto');

async function getOrCreateCollection(clientUUID, type) {
    // Create the collection name based on the client UUID

    let collectionName = ``;

    switch (type) {
        case 'memory':
            collectionName = `memory_collection_${clientUUID}`;
            break;
    }

    try {
        // Use getOrCreateCollection to either get the existing collection or create a new one
        const collection = await client.getOrCreateCollection({
            name: collectionName,
            metadata: {
                description: `Collection for user with UUID: ${clientUUID}`
            }
        });
        
        // console.log(`Collection ${collectionName} retrieved or created successfully.`);
        return collection;

    } catch (error) {
        console.error(`Failed to get or create collection ${collectionName}:`, error);
        throw error;
    }
}

async function addToChroma(clientUUID, type, memory) {
    // Get or create the collection for the specific user
    const collection = await getOrCreateCollection(clientUUID, type);

    // Generate a random identifier to append to the clientUUID
    const randomIdentifier = crypto.randomBytes(4).toString('hex'); // Generates an 8-character random string
    const documentId = `${clientUUID}-${randomIdentifier}`;

    // Add the document to the user's collection
    await collection.add({
        documents: [
            memory,
        ],
        ids: [documentId],
    });

}

async function queryChroma(clientUUID, type, cortexPhrase, nResults) {
    // Get or create the collection for the specific user
    const collection = await getOrCreateCollection(clientUUID, type);

    // Query the collection with the provided phrase
    const results = await collection.query({
        queryTexts: [cortexPhrase], // Chroma will embed this for you
        nResults: nResults, // how many results to return
    });

    return results;
}

module.exports = { getOrCreateCollection, addToChroma, queryChroma };

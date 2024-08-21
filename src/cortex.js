const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { addToChroma, queryChroma } = require('./chromaProvider');

async function addMemoryToCortex(clientUUID, memory) {

    const messages = [
        {
            role: "system",
            content: `You are a cortex. Your purpose is to remember and recall information.
            You will be provided a memory from another model. Your task is to create a recollection based on that memory.
            A record of your recollection will be stored in the model's cortex. The memory should include precise details and context.
            Make sure your recollection is accurate and relevant to the memory provided. Remeember this is a recollection. Do not include any new information or fluff.
            Your recollection should be in the first person and in the past tense. DO NOT include any formatting keep it in text paragraph form.
            You should position your recollection as if you are recalling the memory from your own perspective. And in the context of you helping the user. Include details about what the user asked and how you responded.
            `
        }, 
        {
            role: "user",
            content: `${memory}`
        }
    ];

    try {
        // Get the AI model's response
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 0.2,
        });

        // Extract the assistant's response
        const messageContent = response.choices[0].message.content;

        await addToChroma(clientUUID, "memory", messageContent);

    } catch (error) {
        console.error('Error generating metadata:', error);
    }
}

async function rememberMemories(clientUUID, query, nResults) {
    // Query Cortex to retrieve related memories
    const memories = await queryChroma(clientUUID, "memory", query, nResults);

    if (memories && memories.documents && memories.documents.length > 0) {
        const [documents] = memories.documents; // Deconstruct to get the array of documents
        const [distances] = memories.distances; // Deconstruct to get the array of distances

        // Combine documents and distances into a single array for sorting
        const memoriesByDistance = documents.map((doc, index) => ({
            doc,
            distance: distances[index]
        }));

        // Sort documents by distance in descending order (least distance first)
        memoriesByDistance.sort((a, b) => b.distance - a.distance);

        return memoriesByDistance;
    }
}

module.exports = { addMemoryToCortex, rememberMemories };

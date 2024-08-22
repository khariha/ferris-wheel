const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { addToChroma, queryChroma } = require('./chromaProvider');
const { submitCortexConversation, retrieveCortexConversations } = require('./mongoProvider');

async function queryCortex(clientUUID, searchQuery) {
    // Retrieve relevant recollections based on the search query
    const recollections = await rememberMemories(clientUUID, searchQuery, 10);

    // Initialize the messages array with the system's role and context
    const messages = [
        {
            role: 'system',
            content: 'You are cortex. You are the brains of the system. You deal with memory and recollection.\n' +
                     'You will be presented with context and a request from another model. Based on the query provided by the model, you should pass relevant information to the model.\n' +
                     'This may be verbatim requests or generalized information. You will be asked to return the context according to the request.\n' +
                     '\n' +
                     'Your style of response should be like an entity sharing information about a memory. Do not try to answer anything just provide the context.\n'
        }
    ];

    /*
    // Retrieve previous user and assistant messages from MongoDB
    const previousConversations = await retrieveCortexConversations(clientUUID);

    // Add previous user and assistant messages to the messages array
    previousConversations.forEach(conversation => {
        conversation.messages.forEach(message => {
            if (message.role === 'user' || message.role === 'assistant') {
                messages.push(message);
            }
        });
    });
    */

    // Add each recollection as a system message
    if (recollections && recollections.length > 0) {
        recollections.sort((a, b) => b.distance - a.distance);

        recollections.forEach((recollection, index) => {
            messages.push({
                role: "system",
                content: `Recollection ${index + 1}: ${recollection.doc}`
            });
        });
    }

    // Add the current user query message after recollections
    messages.push({
        role: "user",
        content: `Here is what the model requires to know: ${searchQuery}`
    });

    // Make API request to OpenAI
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: messages
    });

    // Ensure response is valid
    const messageContent = response.choices[0].message.content;

    // Add the assistant's response to messages
    messages.push({
        role: "assistant",
        content: messageContent
    });

    console.log("Messages before filtering:", messages);

    // Filter out system messages before submitting the conversation to the database
    const filteredMessages = messages.filter(msg => msg.role !== 'system');
    // await submitCortexConversation(clientUUID, filteredMessages);

    console.log("Filtered messages:", filteredMessages);

    return messageContent;
}

async function addMemoryToCortex(clientUUID, memory) { // Expand this by including meta data and other information
    await addToChroma(clientUUID, "memory", memory);
    // console.log(`Memory added to Cortex: ${memory}`);
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

module.exports = { addMemoryToCortex, queryCortex };
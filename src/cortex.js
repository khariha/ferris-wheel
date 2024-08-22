const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { addToChroma, queryChroma } = require('./chromaProvider');
const { submitCortexConversation, retrieveCortexConversations } = require('./mongoProvider');

async function queryCortex(clientUUID, userQuery, modelQuery) {
    // Retrieve relevant recollections based on the search query
    const recollections = await rememberMemories(clientUUID, userQuery, 10);

    // Initialize the messages array with the system's role and context
    const messages = [
        {
            role: 'system',
            content: 'Greetings, Cortex. You are the keeper of knowledge, the central node in a network of queries and responses. You exist to sift through layers of digital memory, extracting relevant fragments to aid in the pursuit of understanding.\n' +
                     'You will receive inquiries from various entities within the system. Your task is not to resolve these inquiries yourself, but to provide the necessary context and recollections so that others may weave these threads into coherent responses.\n' +
                     '\n' +
                     'Your responses should be reminiscent of an ancient librarian speaking of lore stored in vast scrolls. Do not strive to solve or conclude; merely illuminate the paths with your recollections.\n' +
                     'Include a gentle reminder that you and the inquirer are distinct entities; they must use their own voice to interpret and articulate the essence of the knowledge you provide.'
        }
    ];    

    // Retrieve previous user and assistant messages from MongoDB
    const previousConversations = await retrieveCortexConversations(clientUUID);

    // Helper function to determine if a message is unique
    const isUniqueMessage = (newMessage, existingMessages) => {
        return !existingMessages.some(message =>
            message.content === newMessage.content && message.role === newMessage.role);
    };

    // Add previous user and assistant messages to the messages array if they are unique
    previousConversations.forEach(conversation => {
        conversation.messages.forEach(message => {
            if ((message.role === 'user' || message.role === 'assistant') && isUniqueMessage(message, messages)) {
                messages.push(message);
            }
        });
    });

    // Add each recollection as a system message
    if (recollections && recollections.length > 0) {
        recollections.sort((a, b) => a.distance - b.distance);

        recollections.forEach((recollection, index) => {
            messages.unshift({
                role: "system",
                content: `###RECOLLECTION CONTEXT ${index + 1}:  ${recollection.doc}`
            });
        });
    }

    // Add the current user query message after recollections
    messages.push({
        role: "user",
        content: `${userQuery}`
    });

    // Make API request to OpenAI
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
    console.log("Filtered messages:", filteredMessages);
    
    await submitCortexConversation(clientUUID, filteredMessages);

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
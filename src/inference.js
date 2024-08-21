const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { addMemoryToCortex, rememberMemories } = require('./cortex');

async function askModel(clientUUID, userQuery) {
    const messages = [];
    let loopCounter = 0; // Initialize loop counter
    
    let finalResponse = null; // To store the assistant's response when finish_reason is 'stop'

    const tools = [
        {
            "type": "function",
            "function": {
                "name": "try_to_remember",
                "description": "Use this function only when you are asked questions regarding past conversations and queries. You will know when this is the case. Or if the answer is context-dependent. When the user asks something from the past and you don't remember, you can ask this function to provide context (if available) from your cortex. This will help you query memories outside of your context window. If your context window doesn't have any relevant messages to the user's query, you can use this to retrieve memories from the past. You will be provided a generalized description of the memory. Use this to prompt the user for claryfying questions and use the excuse that 'you can't remember everything all the time' to keep the conversation going.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "memoryRequest": {
                            "type": "string",
                            "description": "The request for the memory you want to recall. Include details about the context and the user's query.",
                        },
                        "numberOfMemoriesRequested": {
                            "type": "integer",
                            "description": "Your cortex will return the most relevant memories based on the request. You can specify the number of memories you want to retrieve. Your available range is between 1 and 6. Your average should be 3. Adjust accordingly based on the length of the user's query and the context.",
                        },
                        "holdingMessage": {
                            "type": "string",
                            "description": "A holding message to signify to the user that you are performing a memory recall. This can be a statement can be something like 'Give me a second while I...' This message will be displayed to the user while the memory is being retrieved before returning the thread back to you.",
                        },
                    },
                    "required": ["memoryRequest", "numberOfMemoriesRequested", "holdingMessage"],
                    "additionalProperties": false
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "suspend_thread",
                "description": "Use this function when you'd like to suspend the current thread of conversation. You are effectively ending the conversation with the user. This is usuallly an option after you're you've provided a non-function response to the user and the thread is returned to you.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "suspensionReasoning": {
                            "type": "string",
                            "description": "Provide a reason for suspending the thread. This can be a statement indicating that you're suspending the thread.",
                        },
                    },
                    "required": ["suspensionReasoning"],
                    "additionalProperties": false
                },
            }
        }
    ];

    // Add the current user query to the messages array
    messages.push(
        {
            role: "user",
            content: `${userQuery}`
        }
    );

    try {
        while (loopCounter < 6) { // Limit to 6 loop backs

            console.log(messages)

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            });

            const { result, finalizedResponse } = await memoryAbstraction(response, messages, clientUUID, userQuery, finalResponse);

            // Update finalResponse
            finalResponse = finalizedResponse;

            if (result) {
                return result; // Return the final result when ready
            }

            loopCounter++; // Increment the loop counter
        }

        return finalResponse ? finalResponse : "The maximum number of attempts has been reached. Please refine your query or try again later.";

    } catch (error) {
        console.error('Error generating response:', error);
        return 'An error occurred while processing your request.';
    }
}

async function memoryAbstraction(response, messages, clientUUID, userQuery, finalResponse) {
    let messageContent = '';

    console.log(response);

    // Handle the 'stop' finish reason
    if (response.choices[0].finish_reason === 'stop') {
        messageContent = response.choices[0].message.content;

        const memory = JSON.stringify({
            userQuery: userQuery,
            assistantResponse: messageContent
        });

        await addMemoryToCortex(clientUUID, memory);

        messages.push({
            role: "assistant",
            content: messageContent
        });

        // Store the assistant's response to return it later if needed
        finalResponse = messageContent;

        const endThreadMessage = {
            role: "system",
            content: `If you are seeing this message that means you've returned a complete response. Call the 'suspend_thread' function to end the conversation.`
        };

        messages.push(endThreadMessage);

        return { result: null, finalizedResponse: finalResponse };

    } else if (response.choices[0].finish_reason === 'tool_calls') {
        
        const toolCall = response.choices[0].message.tool_calls[0];  // Ensure toolCall is defined
        const toolName = toolCall.function.name;

        console.log("Tool name called: ", toolName); // Log the tool name

        switch (toolName) {
            case 'try_to_remember':
                // If the model suggests a function call to try_to_remember
                const args = JSON.parse(toolCall.function.arguments);

                const searchPhrase = `${userQuery} ${args.memoryRequest}`;

                console.log("Holding message: ", args.holdingMessage);
                console.log("nRequested mems: ", args.numberOfMemoriesRequested);
                console.log("Search phrase: ", searchPhrase);

                const recollections = await rememberMemories(clientUUID, searchPhrase, args.numberOfMemoriesRequested);

                if (recollections && recollections.length > 0) {
                    const noRecollectionsMessage = {
                        role: "system",
                        content: `If you are seeing this message, it means that I've added all the recollections I could find. Do not call the 'try_to_remember' function again.`
                    };

                    if (!messages.some(msg => msg.content === noRecollectionsMessage.content)) {
                        messages.unshift(noRecollectionsMessage);
                    }

                    recollections.sort((a, b) => a.distance - b.distance);

                    recollections.forEach((recollection) => {
                        messages.unshift({
                            role: "system",
                            content: recollection.doc
                        });
                    });

                    return { result: null, finalizedResponse: finalResponse };

                } else {

                    return { result: null, finalizedResponse: finalResponse };
                }

            case 'suspend_thread':
                // If the model suggests a function call to suspend_thread
                const argsSuspend = JSON.parse(toolCall.function.arguments);

                console.log(`Thread suspended: ${argsSuspend.suspensionReasoning}`);

                // Return the stored assistant's response from the 'stop' condition
                return { result: finalResponse ? finalResponse : "Thread was suspended without a prior stop.", finalizedResponse: finalResponse };

            default:
                return { result: messageContent, finalizedResponse: finalResponse };
        }
    }

    return { result: messageContent, finalizedResponse: finalResponse }; // This is returned only if no other conditions match
}

module.exports = { askModel };
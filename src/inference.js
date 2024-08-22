const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { addMemoryToCortex, queryCortex } = require('./cortex');

async function askModel(clientUUID, userQuery) {
    let messages = [];
    let loopCounter = 1; // Initialize loop counter

    let finalResponse = null; // To store the assistant's response when finish_reason is 'stop'

    const tools = [
        {
            "type": "function",
            "function": {
                "name": "try_to_remember",
                "description": "Always call this function before trying to answer the user's question. This function will provide any existing context. This is the function to call when you'd like the model to try and recall a memory from the cortex. You can provide a memory request and a holding message to display to the user while the memory is being retrieved. This relationship between you and the cortex is important for the user to achieve a seamless conversational experience.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "memoryRequest": {
                            "type": "string",
                            "description": "Make this request as specific as possible. Based on the fidelity you are describing, the cortex model will try to recall the most relevant memory. Make sure to specific if you want something verbatim or a generalized recollection.",
                        }
                    },
                    "required": ["memoryRequest"],
                    "additionalProperties": false
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "suspend_thread",
                "description": "Use this function when you'd like to suspend the current thread of conversation. You are effectively ending the conversation with the user. This is usually an option after you've provided a non-function response to the user and the thread is returned to you.",
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

            console.log(messages);

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            });

            const { result, finalizedResponse } = await memoryAbstraction(response, messages, clientUUID, userQuery, finalResponse, loopCounter);

            // Update finalResponse
            finalResponse = finalizedResponse;

            loopCounter++; // Increment the loop counter

            if (result) {
                console.log("Returning result: ", result);
                return result; // Return the final result when ready
            }

        }

        return finalResponse ? finalResponse : "The maximum number of attempts has been reached. Please refine your query or try again later.";

    } catch (error) {
        console.error('Error generating response:', error);
        return 'An error occurred while processing your request.';
    }
}

async function memoryAbstraction(response, messages, clientUUID, userQuery, finalResponse, loopCounter) {
    let messageContent = '';

    // Handle the 'stop' finish reason
    if (response.choices[0].finish_reason === 'stop') {
        messageContent = response.choices[0].message.content;

        const memory = JSON.stringify({
            user: userQuery,
            assistant: messageContent
        });

        messages.push({
            role: "assistant",
            content: messageContent
        });

        await addMemoryToCortex(clientUUID, memory);

        // Store the assistant's response to return it later if needed
        finalResponse = messageContent;

        const endThreadMessage = {
            role: "system",
            content: `If you are seeing this message that means you've returned a complete response. Call the 'suspend_thread' function to end the conversation.`
        };

        const endThreadMessageExists = messages.some(
            message => message.role === "system" && message.content === endThreadMessage.content
        );

        // Only push endThreadMessage if it doesn't already exist
        if (!endThreadMessageExists) {
            messages.push(endThreadMessage);
        }

        return { result: null, finalizedResponse: finalResponse };

    } else if (response.choices[0].finish_reason === 'tool_calls') {

        const toolCall = response.choices[0].message.tool_calls[0];  // Ensure toolCall is defined
        const toolName = toolCall.function.name;

        console.log("Tool name called: ", toolName); // Log the tool name

        switch (toolName) {
            case 'try_to_remember':

                // If the model suggests a function call to try_to_remember
                const args = JSON.parse(toolCall.function.arguments);
                const modelQuery = args.memoryRequest;

                // Logic to query cortex goes here
                const recollection = await queryCortex(clientUUID, userQuery, modelQuery);

                if (recollection) {
                    messages.unshift({
                        role: "system",
                        content: `###CONTEXT: ${recollection}`
                    });
                }

                // console.log("Loop conter after recollection: ", loopCounter);

                const avoidRememberRecall = {
                    role: "system",
                    content: `###INSTRUCTION: If you are seeing this message that means you've successfully retrieved a memory. Do not call the 'try_to_remember' function again unless instructed. You've called on 'try_to_remember' ${loopCounter} times already. You are limited to calling it 3 times. Return an assistant response immediately.`
                };

                // Find and replace the existing message if it exists
                const avoidRememberRecallIndex = messages.findIndex(
                    message => message.role === "system" && message.content.includes("If you are seeing this message that means you've successfully retrieved a memory.")
                );
                
                if (avoidRememberRecallIndex !== -1) {
                    // Replace the existing message with the updated one
                    messages[avoidRememberRecallIndex] = avoidRememberRecall;
                } else {
                    // Otherwise, add the new message
                    messages.push(avoidRememberRecall);
                }               

                return { result: null, finalizedResponse: finalResponse };

            case 'suspend_thread':
                // If the model suggests a function call to suspend_thread
                const argsSuspend = JSON.parse(toolCall.function.arguments);

                // console.log(`Thread suspended: ${argsSuspend.suspensionReasoning}`);

                // Return the stored assistant's response from the 'stop' condition
                return { result: finalResponse ? finalResponse : "Thread was suspended without a prior stop.", finalizedResponse: finalResponse };

            default:
                return { result: messageContent, finalizedResponse: finalResponse };
        }
    }

    return { result: messageContent, finalizedResponse: finalResponse }; // This is returned only if no other conditions match
}

module.exports = { askModel };

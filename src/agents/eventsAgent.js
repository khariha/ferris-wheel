const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { createEventObject, getEvents, createEvent, updateEvent, deleteEvent } = require('../agent-services/eventsService');

async function queryEventsAgent(clientUUID, modelQuery) {

    const tools = [
        {
            "type": "function",
            "function": {
                "name": "get_client_events",
                "description": "Fetches all events associated with a particular client UUID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "clientUUID": {
                            "type": "string",
                            "description": "The unique identifier for the client whose events you want to retrieve.",
                        },
                    },
                    "required": ["clientUUID"],
                    "additionalProperties": false
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_client_event",
                "description": "Adds a new event to the client's calendar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "add_clientUUID": {
                            "type": "string",
                            "description": "The unique identifier for the client to whom the event belongs.",
                        },
                        "uuid": {
                            "type": "string",
                            "description": "A unique identifier for the event. If not provided, one will be generated.",
                        },
                        "title": {
                            "type": "string",
                            "description": "The title or name of the event.",
                        },
                        "date": {
                            "type": "string",
                            "description": "The date of the event in YYYY-MM-DD format.",
                        },
                        "start_time": {
                            "type": "string",
                            "description": "The start time of the event in HH:MM format (24-hour). Optional if the event is an all-day event.",
                        },
                        "end_time": {
                            "type": "string",
                            "description": "The end time of the event in HH:MM format (24-hour). Optional if the event is an all-day event.",
                        },
                        "location": {
                            "type": "string",
                            "description": "The location where the event will take place.",
                        },
                        "description": {
                            "type": "string",
                            "description": "A brief description of the event.",
                        },
                        "collaborators": {
                            "type": "array",
                            "description": "A list of collaborators involved in the event.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "The name of the collaborator."
                                    }
                                },
                                "required": ["name"]
                            }
                        },
                        "reminders": {
                            "type": "array",
                            "description": "A list of reminders set for the event.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "time_before": {
                                        "type": "string",
                                        "description": "The time before the event when the reminder should trigger (e.g., '15m', '1h', '1d')."
                                    },
                                    "method": {
                                        "type": "string",
                                        "description": "The method of the reminder (e.g., 'popup', 'email')."
                                    }
                                },
                                "required": ["time_before", "method"]
                            }
                        },
                        "all_day": {
                            "type": "boolean",
                            "description": "Indicates if the event is an all-day event. If true, start_time and end_time can be omitted."
                        },
                    },
                    "required": ["add_clientUUID", "title", "date"],
                    "additionalProperties": false
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "update_client_event",
                "description": "Updates an existing event in the client's calendar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "update_clientUUID": {
                            "type": "string",
                            "description": "The unique identifier for the client to whom the event belongs.",
                        },
                        "update_uuid": {
                            "type": "string",
                            "description": "The unique identifier of the event to be updated.",
                        },
                        "updateFields": {
                            "type": "object",
                            "description": "An object containing the fields to be updated.",
                            "properties": {
                                "title": {
                                    "type": "string",
                                    "description": "The updated title of the event.",
                                },
                                "date": {
                                    "type": "string",
                                    "description": "The updated date of the event in YYYY-MM-DD format.",
                                },
                                "start_time": {
                                    "type": "string",
                                    "description": "The updated start time of the event in HH:MM format (24-hour).",
                                },
                                "end_time": {
                                    "type": "string",
                                    "description": "The updated end time of the event in HH:MM format (24-hour).",
                                },
                                "location": {
                                    "type": "string",
                                    "description": "The updated location of the event.",
                                },
                                "description": {
                                    "type": "string",
                                    "description": "The updated description of the event.",
                                },
                                "collaborators": {
                                    "type": "array",
                                    "description": "The updated list of collaborators for the event.",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {
                                                "type": "string",
                                                "description": "The name of the collaborator."
                                            }
                                        },
                                        "required": ["name"]
                                    }
                                },
                                "reminders": {
                                    "type": "array",
                                    "description": "The updated list of reminders for the event.",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "time_before": {
                                                "type": "string",
                                                "description": "The updated time before the event when the reminder should trigger."
                                            },
                                            "method": {
                                                "type": "string",
                                                "description": "The updated method of the reminder."
                                            }
                                        },
                                        "required": ["time_before", "method"]
                                    }
                                },
                                "all_day": {
                                    "type": "boolean",
                                    "description": "Indicates if the event is now an all-day event.",
                                },
                            },
                            "additionalProperties": false
                        },
                    },
                    "required": ["update_clientUUID", "update_uuid", "updateFields"],
                    "additionalProperties": false
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "delete_client_event",
                "description": "Deletes an event from the client's calendar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "delete_clientUUID": {
                            "type": "string",
                            "description": "The unique identifier for the client to whom the event belongs.",
                        },
                        "delete_uuid": {
                            "type": "string",
                            "description": "The unique identifier of the event to be deleted.",
                        },
                    },
                    "required": ["delete_clientUUID", "delete_uuid"],
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

    let messages = [];
    let loopCounter = 1; // Initialize loop counter

    let finalResponse = null; // To store the assistant's response when finish_reason is 'stop'

    const instructionSet = [
        {
            role: 'system',
            content: `Hello you are events agent. You have the ability to create, read, update and delete events.
            You will be provided with the user's client UUID and you will be able to perform the following operations:
            - Create an event
            - Read an event
            - Update an event
            - Delete an event

            You will end your thread with another agent by always returning an non-function response confirming the action taken.
            Then you will suspend the thread by calling the suspend_thread function.

            Always start by calling the get_client_events function to get the user's events. Then proceed with the desired action.
            `
        }
    ];

    messages.push(...instructionSet);

    messages.push(
        {
            role: "user",
            content: `The client uuid: ${clientUUID}. The query from the user: ${modelQuery}`
        }
    );

    try {
        while (loopCounter <= 3) { // Limit to 6 loop backs

            console.log("Events agent logs: ", messages);

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            });

            const { result, finalizedResponse } = await eventsAbstraction(response, messages, clientUUID, modelQuery, finalResponse, loopCounter);

            // Update finalResponse
            finalResponse = finalizedResponse;

            loopCounter++; // Increment the loop counter

            if (result) {
                // console.log("Returning result: ", result);
                return result;
            }

        }

        return finalResponse ? finalResponse : "The maximum number of attempts has been reached. Please refine your query or try again later.";

    } catch (error) {
        console.error('Error generating response:', error);
        return 'An error occurred while processing your request.';
    }
}

async function eventsAbstraction(response, messages, finalResponse, loopCounter) {

    let messageContent = '';

    if (response.choices[0].finish_reason === 'stop') {

        const messageContent = response.choices[0].message.content;
        // console.log("Non-function response:", messageContent);

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

        const endThreadMessageExists = messages.some(
            message => message.role === "system" && message.content === endThreadMessage.content
        );

        // Only push endThreadMessage if it doesn't already exist
        if (!endThreadMessageExists) {
            messages.push(endThreadMessage);
        }

        return { result: finalResponse, finalizedResponse: finalResponse };

    } else if (response.choices[0].finish_reason === 'tool_calls') {

        const toolCall = response.choices[0].message.tool_calls[0];  // Ensure toolCall is defined
        const toolName = toolCall.function.name;

        console.log("Tool call called: ", toolCall); // Log the tool name
        console.log("Tool name called: ", toolName); // Log the tool name

        switch (toolName) {
            case "get_client_events":

                const argsForGet = JSON.parse(toolCall.function.arguments);

                const eventsForClient = await getEvents(argsForGet.clientUUID);
                // console.log("Events for client:", eventsForClient);

                if (eventsForClient.length === 0) {
                    // If no events are found, push a message indicating this
                    messages.push({
                        role: "system",
                        content: `No events were found for client ${argsForGet.clientUUID}.`
                    });
                } else {
                    // If events are found, push a general message followed by each event
                    messages.push({
                        role: "system",
                        content: `Events for client ${argsForGet.clientUUID}:`
                    });

                    eventsForClient.forEach(event => {
                        const collaborators = event.collaborators && event.collaborators.length > 0
                            ? event.collaborators.map(collaborator => collaborator.name).join(', ')
                            : 'None';

                        messages.push({
                            role: "system",
                            content: `Event UUID: ${event.uuid}, Title: ${event.title}, Date: ${event.date}, Start Time: ${event.start_time || 'N/A'}, End Time: ${event.end_time || 'N/A'}, Location: ${event.location || 'N/A'}, Description: ${event.description || 'N/A'}, Collaborators: ${collaborators}.`
                        });
                    });
                }

                const getEventsConfirmation = {
                    role: "system",
                    content: `###INSTRUCTION: If you are seeing this message that means you've successfully performed a get_client_events function for client ${argsForGet.clientUUID}. Do not call the 'get_client_events' function again unless instructed. Return an assistant response answering the user's query immediately.`
                };

                // Find and replace the existing message if it exists
                const getEventsConfirmationIndex = messages.findIndex(
                    message => message.role === "system" && message.content.includes("get_client_events")
                );

                if (getEventsConfirmationIndex !== -1) {
                    // Replace the existing message with the updated one
                    messages[getEventsConfirmationIndex] = getEventsConfirmation;
                } else {
                    // Otherwise, add the new message
                    messages.push(getEventsConfirmation);
                }

                return { result: null, finalizedResponse: finalResponse };

            case "add_client_event":

                const { add_clientUUID, title, date, start_time, end_time, location, description, collaborators, reminders, all_day } = JSON.parse(toolCall.function.arguments);

                const newEvent = createEventObject({
                    title,
                    date,
                    start_time,
                    end_time,
                    location,
                    description,
                    collaborators,
                    reminders,
                    all_day
                });

                await createEvent(add_clientUUID, newEvent);

                const addEventConfirmation = {
                    role: "system",
                    content: `###INSTRUCTION: Successfully created a new event for client ${add_clientUUID}.\n\n` +
                        `**Event Details:**\n` +
                        `- **Title**: ${newEvent.title}\n` +
                        `- **Date**: ${newEvent.date}\n` +
                        `- **Start Time**: ${newEvent.start_time || 'N/A'}\n` +
                        `- **End Time**: ${newEvent.end_time || 'N/A'}\n` +
                        `- **Location**: ${newEvent.location || 'N/A'}\n` +
                        `- **Description**: ${newEvent.description || 'N/A'}\n` +
                        `- **Collaborators**: ${newEvent.collaborators.map(c => c.name).join(', ') || 'None'}\n` +
                        `- **Reminders**: ${newEvent.reminders.map(r => `${r.time_before} before via ${r.method}`).join(', ') || 'None'}\n` +
                        `- **All Day Event**: ${newEvent.all_day ? 'Yes' : 'No'}\n\n` +
                        `Do not call the 'get_client_events' function again unless instructed. Return an assistant response confirming your action for the user.`
                };

                // Find and replace the existing message if it exists
                const addEventConfirmationIndex = messages.findIndex(
                    message => message.role === "system" && message.content.includes("add_client_event")
                );

                if (addEventConfirmationIndex !== -1) {
                    // Replace the existing message with the updated one
                    messages[addEventConfirmationIndex] = addEventConfirmation;
                } else {
                    // Otherwise, add the new message
                    messages.push(addEventConfirmation);
                }

                return { result: null, finalizedResponse: finalResponse };

            case "update_client_event":

                const updateArgs = JSON.parse(toolCall.function.arguments);
                const { update_clientUUID, update_uuid, updateFields } = updateArgs;

                await updateEvent(update_clientUUID, update_uuid, updateFields);

                const updateConfirmation = {
                    role: "system",
                    content: `###INSTRUCTION: Successfully updated the event with UUID ${update_uuid} for client ${update_clientUUID}. Updated fields: ${Object.keys(updateFields).join(', ')}. Do not call the 'update_client_event' function again unless instructed. Return an assistant response confirming your action for the user.`
                };
            
                messages.push(updateConfirmation);
            
                return { result: null, finalizedResponse: finalResponse };

            case "delete_client_event":

                const deleteArgs = JSON.parse(toolCall.function.arguments);
                const { delete_clientUUID, delete_uuid } = deleteArgs;

                await deleteEvent(delete_clientUUID, delete_uuid);

                const deleteConfirmation = {
                    role: "system",
                    content: `###INSTRUCTION: Successfully deleted the event with UUID ${delete_uuid} for client ${delete_clientUUID}. Do not call the 'delete_client_event' function again unless instructed. Return an assistant response confirming your action for the user.`
                };
            
                messages.push(deleteConfirmation);

                return { result: null, finalizedResponse: finalResponse };

            case "suspend_thread":

                const argsSuspend = JSON.parse(toolCall.function.arguments);
                console.log(`Thread suspended: ${argsSuspend.suspensionReasoning}`);

                return { result: finalResponse ? finalResponse : "Thread was suspended without a prior stop.", finalizedResponse: finalResponse };

            default:
                return { result: messageContent, finalizedResponse: finalResponse };
        }

    }
}

module.exports = { queryEventsAgent };

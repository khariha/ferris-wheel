require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017/minatoDB";
let client;

const generateUUID = require('uuid').v4;

const createEventObject = ({
    uuid = generateUUID(), // Generate a new UUID if not provided
    title,
    date,
    start_time,
    end_time,
    location = "",
    description = "",
    collaborators = [],
    reminders = [],
    all_day = false,
}) => {
    if (!title || !date) {
        throw new Error("Event must have a title and a date.");
    }

    return {
        uuid,
        title,
        date,
        start_time: all_day ? null : start_time,
        end_time: all_day ? null : end_time,
        location,
        description,
        collaborators,
        reminders,
        all_day,
    };
};

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

async function getEvents(clientUUID) {
    const db = await connectToDatabase();
    const collection = db.collection(`${clientUUID}_events`);
    
    try {
        const events = await collection.find({}).toArray();
        return events;
    } catch (err) {
        console.error('Error fetching events:', err);
        throw err;
    }
}


async function createEvent(clientUUID, event) {
    const db = await connectToDatabase();
    const collection = db.collection(`${clientUUID}_events`);

    try {
        // Ensure event has a UUID
        if (!event.uuid) {
            throw new Error("Event must have a UUID.");
        }
        
        const result = await collection.insertOne(event);
        return result.insertedId;
    } catch (err) {
        console.error('Error creating event:', err);
        throw err;
    }
}


async function readEvent(clientUUID, eventUUID) {
    const db = await connectToDatabase();
    const collection = db.collection(`${clientUUID}_events`);

    try {
        const event = await collection.findOne({ uuid: eventUUID });
        if (!event) {
            throw new Error(`Event with UUID ${eventUUID} not found.`);
        }
        return event;
    } catch (err) {
        console.error('Error reading event:', err);
        throw err;
    }
}


async function updateEvent(clientUUID, eventUUID, updateFields) {
    const db = await connectToDatabase();
    const collection = db.collection(`${clientUUID}_events`);

    try {
        const result = await collection.updateOne(
            { uuid: eventUUID },
            { $set: updateFields }
        );
        if (result.matchedCount === 0) {
            throw new Error(`Event with UUID ${eventUUID} not found.`);
        }
        return result.modifiedCount;
    } catch (err) {
        console.error('Error updating event:', err);
        throw err;
    }
}


async function deleteEvent(clientUUID, eventUUID) {
    const db = await connectToDatabase();
    const collection = db.collection(`${clientUUID}_events`);

    try {
        const result = await collection.deleteOne({ uuid: eventUUID });
        if (result.deletedCount === 0) {
            throw new Error(`Event with UUID ${eventUUID} not found.`);
        }
        return result.deletedCount;
    } catch (err) {
        console.error('Error deleting event:', err);
        throw err;
    }
}

module.exports = {
    createEventObject,
    getEvents,
    createEvent,
    readEvent,
    updateEvent,
    deleteEvent,
};

/*
Example Event Object for Reference:

const exampleEvent = {
    uuid: "550e8400-e29b-41d4-a716-446655440000", // Unique identifier for the event
    title: "Morning Standup Meeting",             // Title of the event
    date: "2024-08-22",                           // Date of the event in YYYY-MM-DD format
    start_time: "09:00",                          // Start time of the event in HH:MM format (24-hour)
    end_time: "09:30",                            // End time of the event in HH:MM format (24-hour)
    location: "Virtual - Zoom",                   // Location of the event (optional)
    description: "Daily team sync-up.",           // Brief description of the event (optional)
    collaborators: [                              // List of collaborators (optional)
        { name: "Alice Johnson" },                // Collaborator 1
        { name: "Bob Smith" },                    // Collaborator 2
        { name: "Charlie Davis" }                 // Collaborator 3
    ],
    reminders: [                                  // List of reminders for the event (optional)
        { time_before: "10m", method: "popup" },  // Reminder 1: Popup 10 minutes before the event
        { time_before: "1h", method: "email" }    // Reminder 2: Email 1 hour before the event
    ],
    all_day: false                                // Boolean flag indicating if the event is an all-day event
};
*/


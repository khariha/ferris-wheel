const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);


async function queryCalender() {

    const messages = [
        {
            role: "system",
            content: `You are calender. Your purpose is to organize and manage events for the user.
            `
        }, 
        {
            role: "user",
            content: `${memory}`
        }
    ];

}
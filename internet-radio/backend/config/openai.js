const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const chatCompletion = async (messages, options = {}) => {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 500,
    ...options,
  });
  return response.choices[0].message.content;
};

module.exports = { openai, model, chatCompletion };

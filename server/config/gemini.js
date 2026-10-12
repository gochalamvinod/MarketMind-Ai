const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    console.log('[Gemini AI] Initialized successfully with model: gemini-3.5-flash-lite');
  } catch (error) {
    console.error(`[Gemini AI] Initialization failed: ${error.message}`);
    model = null;
  }
} else {
  console.log('[Gemini AI] GEMINI_API_KEY is not set. AI features will be disabled or mocked.');
  model = null;
}

/**
 * Check if Gemini AI model is configured and available for inference
 * @returns {boolean}
 */
const isGeminiAvailable = () => {
  return model !== null;
};

module.exports = {
  genAI,
  model,
  isGeminiAvailable
};

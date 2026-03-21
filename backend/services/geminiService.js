// services/aiService.js  (OpenRouter backend)
const OpenAI = require('openai');

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
    'X-Title': 'StudyPlan AI',
  },
});

// Ordered fallback list — tries each model in turn on 429 / capacity errors
// Confirmed-available free models on OpenRouter (Feb 2026)
const FREE_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'openai/gpt-oss-120b:free',
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'arcee-ai/trinity-large-preview:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'z-ai/glm-4.5-air:free',
  'arcee-ai/trinity-mini:free',
];

// If user pinned a model in .env, try it first then fall through the rest
const FALLBACK_MODELS = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL, ...FREE_MODELS.filter((m) => m !== process.env.OPENROUTER_MODEL)]
  : FREE_MODELS;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Safely extract JSON from an AI response string.
 * Handles code fences like ```json ... ``` or bare JSON.
 */
const extractJSON = (text) => {
  try { return JSON.parse(text.trim()); } catch (_) {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
  }

  const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[1].trim()); } catch (_) {}
  }

  throw new Error('Could not extract valid JSON from AI response');
};

/** Returns true for errors that mean we should try the next model */
const isCapacityError = (err) => {
  const status = err?.status ?? err?.response?.status;
  const msg = (err?.message || '').toLowerCase();
  return status === 429 || status === 503 || status === 404 || status === 500 ||
    msg.includes('429') || msg.includes('503') || msg.includes('rate limit') ||
    msg.includes('capacity') || msg.includes('no endpoints') || msg.includes('overloaded') ||
    msg.includes('unavailable') || msg.includes('choices');
};

/**
 * Call OpenRouter — automatically walks through FALLBACK_MODELS on 429/503/404.
 * Retries the winning model once with a stricter JSON prompt if parsing fails.
 * @param {string} prompt - user prompt
 * @param {boolean} jsonMode - add system message enforcing JSON-only output
 */
const callAI = async (prompt, jsonMode = true) => {
  const messages = [];
  if (jsonMode) {
    messages.push({
      role: 'system',
      content: 'You are a helpful assistant. You MUST respond with valid JSON only. No markdown, no code fences, no explanations outside the JSON object. Your entire response must be parseable by JSON.parse().',
    });
  }
  messages.push({ role: 'user', content: prompt });

  let lastError;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`[AI] Trying model: ${model}`);

      const requestPayload = { model, messages };
      // Some models support response_format — add it opportunistically
      try { requestPayload.response_format = { type: 'json_object' }; } catch (_) {}

      let completion = await openrouter.chat.completions.create(requestPayload);

      // Guard: some free models return empty/malformed choices
      let text = completion?.choices?.[0]?.message?.content;
      if (!text || !text.trim()) {
        console.warn(`[AI] Model ${model} returned empty response, trying next…`);
        await sleep(1000);
        continue;
      }

      console.log(`[AI] Raw response (first 300 chars): ${text.slice(0, 300)}`);

      try {
        return extractJSON(text);
      } catch (_) {
        // JSON parse failed — retry same model with stricter instruction
        const retryMessages = [
          ...messages,
          { role: 'assistant', content: text },
          { role: 'user', content: 'Your previous response was not valid JSON. Output ONLY the raw JSON object now, starting with { and ending with }. No other text.' },
        ];
        completion = await openrouter.chat.completions.create({ model, messages: retryMessages });
        text = completion?.choices?.[0]?.message?.content;
        if (!text || !text.trim()) {
          console.warn(`[AI] Model ${model} returned empty JSON retry, trying next…`);
          await sleep(1000);
          continue;
        }
        console.log(`[AI] Retry raw response (first 300 chars): ${text.slice(0, 300)}`);
        return extractJSON(text);
      }
    } catch (err) {
      lastError = err;
      if (isCapacityError(err)) {
        console.warn(`[AI] Model ${model} unavailable (${err?.status ?? err.message}), trying next fallback…`);
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('All AI models failed or are at capacity. Please try again in a moment.');
};

// ─── STUDY PLAN ──────────────────────────────────────────────────────────────

/**
 * Generate a day-by-day study plan from lecture texts.
 *
 * @param {number} daysAvailable
 * @param {number} moduleCode
 * @param {Array<{lectureNo: number, lectureTitle: string, text: string}>} lectures
 * @returns {Promise<Object>} JSON study plan
 *
 * JSON Schema returned:
 * {
 *   "moduleCode": "IT3020",
 *   "totalDays": 5,
 *   "days": [
 *     {
 *       "day": 1,
 *       "date": "2026-02-22",
 *       "focus": "Lecture 1 - Introduction",
 *       "topics": ["Topic A", "Topic B"],
 *       "activities": ["Read section on X", "Summarise Y"],
 *       "estimatedHours": 2
 *     }
 *   ],
 *   "summary": "Brief overall summary"
 * }
 */
const MAX_TEXT_PER_LECTURE = 3000; // chars — keeps total prompt manageable
const MAX_TOTAL_TEXT = 18000;       // chars

const generateStudyPlan = async (daysAvailable, moduleCode, lectures, examDate) => {
  // Truncate each lecture's text to avoid exceeding context window
  let totalChars = 0;
  const lectureContent = lectures
    .map((l) => {
      const raw = (l.text || '').trim() || '[No text extracted for this lecture]';
      const truncated = raw.length > MAX_TEXT_PER_LECTURE ? raw.slice(0, MAX_TEXT_PER_LECTURE) + '…[truncated]' : raw;
      totalChars += truncated.length;
      return `=== LECTURE ${l.lectureNo}${l.lectureTitle ? ': ' + l.lectureTitle : ''} ===\n${truncated}`;
    })
    .join('\n\n')
    .slice(0, MAX_TOTAL_TEXT);

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Create a ${daysAvailable}-day study plan for module ${moduleCode} using ONLY the lecture content below. Exam date: ${examDate}. Today: ${today}.

LECTURE CONTENT:
${lectureContent}

Return a single JSON object with this exact structure (no extra text, no markdown):
{
  "moduleCode": "${moduleCode}",
  "examDate": "${examDate}",
  "totalDays": ${daysAvailable},
  "days": [
    {
      "day": 1,
      "date": "${today}",
      "focus": "what lectures/topics are covered today",
      "topics": ["topic from lecture content"],
      "activities": ["activity based on lecture content"],
      "estimatedHours": 2
    }
  ],
  "summary": "brief overall study strategy"
}

Rules:
- Output ONLY the JSON object. Nothing before or after it.
- Include exactly ${daysAvailable} day entries.
- Base all topics and activities strictly on the provided lecture content.`;

  return callAI(prompt);
};

// ─── MCQ GENERATION ──────────────────────────────────────────────────────────

/**
 * Generate MCQs from lecture texts.
 *
 * @param {string} moduleCode
 * @param {Array<{lectureNo: number, lectureTitle: string, text: string}>} lectures
 * @param {number} numQuestions
 * @returns {Promise<Object>} JSON MCQ set
 *
 * JSON Schema:
 * {
 *   "moduleCode": "IT3020",
 *   "questions": [
 *     {
 *       "q": "Question text",
 *       "options": ["A", "B", "C", "D"],
 *       "answerIndex": 0,
 *       "explanation": "Explanation from lecture content"
 *     }
 *   ]
 * }
 */
const generateMCQs = async (moduleCode, lectures, numQuestions = 10) => {
  const lectureContent = lectures
    .map(
      (l) =>
        `=== LECTURE ${l.lectureNo}${l.lectureTitle ? ': ' + l.lectureTitle : ''} ===\n${
          l.text.trim() || '[No text extracted for this lecture]'
        }`
    )
    .join('\n\n');

  const prompt = `You are an MCQ generator for university students. Create ${numQuestions} multiple-choice questions EXCLUSIVELY from the lecture content below. Do NOT use any outside knowledge.

MODULE: ${moduleCode}
LECTURES COVERED: ${lectures.map((l) => `Lecture ${l.lectureNo}`).join(', ')}

LECTURE CONTENT (use ONLY this):
---
${lectureContent}
---

INSTRUCTIONS:
1. Every question and answer must be directly based on the lecture text above.
2. Each question must have exactly 4 options (A, B, C, D).
3. Only one option is correct. answerIndex is 0-based (0=A, 1=B, 2=C, 3=D).
4. Explanation must cite or paraphrase the relevant part of the lecture content.
5. Questions should test understanding, not just memorization.
6. If lecture content is insufficient for ${numQuestions} questions, generate as many as possible.
7. Respond with ONLY valid JSON matching this exact schema:

{
  "moduleCode": "${moduleCode}",
  "questions": [
    {
      "q": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Explanation citing lecture content"
    }
  ]
}`;

  return callAI(prompt);
};

module.exports = { generateStudyPlan, generateMCQs };

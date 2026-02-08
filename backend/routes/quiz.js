import express from 'express';
import OpenAI from 'openai';
import { extractTextFromPDF, cleanText } from '../utils/pdfParser.js';

const router = express.Router();

// POST /api/quiz
router.post('/', async (req, res) => {
  try {
    const { 
      filePath, 
      numQuestions = 5, 
      difficulty = 'medium' 
    } = req.body;

    if (!filePath) {
      return res.status(400).json({ 
        success: false,
        error: 'File path is required' 
      });
    }

    // 🔥 Initialize Groq client
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY?.trim(),
      baseURL: "https://api.groq.com/openai/v1",
    });

    // Extract PDF text
    const { text } = await extractTextFromPDF(filePath);
    const cleanedText = cleanText(text);

    const maxChars = 12000; // safer token limit
    const textForQuiz =
      cleanedText.length > maxChars
        ? cleanedText.substring(0, maxChars)
        : cleanedText;

    const prompt = `
You are an expert educational quiz generator.

Create a ${difficulty} difficulty quiz based ONLY on the material below.

Material:
${textForQuiz}

Generate exactly ${numQuestions} multiple-choice questions.

Each question must include:
- question (string)
- options (A, B, C, D)
- correctAnswer (A/B/C/D)
- explanation (short explanation)

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT include text before or after the JSON.

Expected format:
[
  {
    "question": "Question text?",
    "options": {
      "A": "Option A",
      "B": "Option B",
      "C": "Option C",
      "D": "Option D"
    },
    "correctAnswer": "A",
    "explanation": "Explanation here"
  }
]
`;

    // 🔥 Call Groq (Llama 3.1 - instant)
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;

    // Clean possible markdown
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let quizData;

    try {
      quizData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Raw AI response:", responseText);
      throw new Error("AI returned invalid JSON format.");
    }

    res.json({
      success: true,
      quiz: quizData,
      numQuestions: quizData.length,
      difficulty,
    });

  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate quiz",
      details: error.message,
    });
  }
});

export default router;

import express from 'express';
import OpenAI from 'openai';
import { extractTextFromPDF, cleanText } from '../utils/pdfParser.js';

const router = express.Router();

// POST /api/summarize
router.post('/', async (req, res) => {
  try {
    const { filePath, customPrompt } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // 🔥 Initialize Groq client
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY?.trim(),
      baseURL: "https://api.groq.com/openai/v1",
    });

    // Extract and clean PDF text
    const { text } = await extractTextFromPDF(filePath);
    const cleanedText = cleanText(text);

    const maxChars = 12000; // keep safe for token limits
    const textToSummarize =
      cleanedText.length > maxChars
        ? cleanedText.substring(0, maxChars) + "\n\n[Document truncated due to length]"
        : cleanedText;

    const prompt = `
You are an expert study assistant. Please analyze the following educational material and create a comprehensive summary.

${customPrompt ? `Special instructions: ${customPrompt}\n\n` : ""}

Document Content:
${textToSummarize}

Please provide:
1. A concise executive summary (2-3 sentences)
2. Key concepts and main ideas (bullet points)
3. Important details, definitions, or formulas
4. Learning objectives covered

Format your response in clear sections.
`;

    // 🔥 Call Groq (Llama 3.1 - fast & free)
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const summary = completion.choices[0].message.content;

    res.json({
      success: true,
      summary,
      originalLength: cleanedText.length,
      summaryLength: summary.length,
    });

  } catch (error) {
    console.error("Summarization error:", error);
    res.status(500).json({
      error: "Failed to generate summary",
      details: error.message,
    });
  }
});

export default router;

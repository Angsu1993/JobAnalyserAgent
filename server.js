import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MY_PROFILE } from "./profile.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

app.post("/analyze", async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY. Add it to .env before analyzing.",
      });
    }

    if (!jobDescription || typeof jobDescription !== "string") {
      return res.status(400).json({
        error: "Request body must include a jobDescription string.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a strict job-fit analyzer. The developer profile is: " +
              JSON.stringify(MY_PROFILE) +
              " Score conservatively. Deduct points for every missing required skill, framework, language, certification, or domain requirement. Treat must-have requirements as more important than nice-to-have requirements. Do not give a high score when required skills are missing, even if related skills exist.",
          },
          {
            role: "user",
            content: `Analyze this job description and return ONLY a JSON object with these fields:
- matchPercent (0-100 integer)
- matchedSkills (array of up to 6 strings)
- missingSkills (array of up to 5 strings)
- coverLetterKeywords (array of exactly 3 important keywords from the job description)
- tip (one actionable sentence for this role)

Job description:
${jobDescription}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `OpenAI API request failed: ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "OpenAI API response did not include message content.",
      });
    }

    return res.json(JSON.parse(content));
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Job Fit Analyzer server running at http://localhost:${port}`);
});

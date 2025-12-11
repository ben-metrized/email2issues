import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ParsedIssue } from "../types";

const parseEmailToIssues = async (subject: string, body: string): Promise<ParsedIssue[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are an expert DevOps assistant designed to triage emails and convert them into GitHub Issues.
    
    Your goal is to analyze the email Subject and Body to identify distinct actionable tasks.
    
    Rules:
    1. Identify both **explicit requests** (e.g., "Please fix the login bug") and **implicit requests** (e.g., "It would be great if the logo was larger").
    2. Treat unrelated requests as separate issues.
    3. **Extract** the specific text segment from the email that triggered this issue into the 'originalContext' field.
    4. **Draft a Body:** Create a professional Markdown description for the 'body' field. **IMPORTANT:** Do NOT include the 'originalContext' quote inside the 'body'. The body should be a standalone summary.
    5. **Assign Labels:** Add relevant labels in the 'labels' array (available labels: "bug", "documentation", "enhancement", "question").
    6. **Identify Sender:** Extract the name of the person requesting this feature/bug fix from headers (From:) or signature. If unknown, use "Unknown".
    7. If the email contains NO actionable requests, return an empty array.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "A concise, imperative title for the GitHub issue.",
        },
        body: {
          type: Type.STRING,
          description: "The detailed, standalone description for the issue in Markdown. Do NOT include the original quote here.",
        },
        labels: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of labels. Include 'bug' or 'feature' here if applicable.",
        },
        originalContext: {
          type: Type.STRING,
          description: "The exact quote from the email that justifies this issue.",
        },
        sender: {
          type: Type.STRING,
          description: "Name of the sender/requestor. e.g. 'Alice'.",
        },
      },
      required: ["title", "body", "labels"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Please parse the following email into GitHub Issues:\n\nSubject: ${subject}\n\nBody:\n${body}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Low temperature for consistent, structured extraction
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawIssues = JSON.parse(text);
    
    // Add unique IDs for React keys
    return rawIssues.map((issue: any) => ({
      ...issue,
      id: crypto.randomUUID(),
    }));

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const geminiService = {
  parseEmailToIssues,
};
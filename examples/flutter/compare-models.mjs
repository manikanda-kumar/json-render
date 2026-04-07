import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_DIR = "/tmp/json-render-flutter-model-compare";
const MODELS = ["google/gemini-2.5-pro", "openai/gpt-5.4"];

async function callOpenRouter(model, prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://json-render.dev",
      "X-Title": "json-render flutter comparison",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You convert json-render specs into Flutter pages. Output only valid Dart code with no markdown fences and no commentary.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${model} failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(`${model} returned no code`);
  }

  return content;
}

function buildPrompt(specJson) {
  return `Convert this json-render spec into a single Flutter page widget named ProfileDashboardPage.

Requirements:
- Use package:flutter/material.dart
- Output only the Dart widget code for the page file
- Keep the stats list and save button behavior
- Treat the email field as editable local state
- Do not use markdown fences

Spec:
${specJson}`;
}

async function main() {
  const specJson = await readFile(new URL("./spec.json", import.meta.url), "utf8");
  const prompt = buildPrompt(specJson);
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const model of MODELS) {
    const content = await callOpenRouter(model, prompt);
    const fileName = model.replaceAll("/", "__") + ".dart";
    const outputPath = join(OUTPUT_DIR, fileName);
    await writeFile(outputPath, content);
    console.log(`${model} -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

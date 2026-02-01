/**
 * Test script for AI Flashcards API
 * Usage:
 * 1. Ensure your Next.js server is running (npm run dev)
 * 2. Run this script using node: node test-api.js
 */

async function testGenerateAPI() {
  const endpoint =
    "http://localhost:3000/api/generate";
  const topic = "Javascript Promise";

  console.log(
    `Testing API at ${endpoint} with topic: "${topic}"...`,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log("✅ API Response Success:");
    console.log(JSON.stringify(data, null, 2));

    if (
      Array.isArray(data) &&
      data.length > 0
    ) {
      console.log(
        "✅ Validation: Returned an array of flashcards.",
      );
      if (data[0].front && data[0].back) {
        console.log(
          "✅ Validation: Flashcard structure is correct (front/back).",
        );
      } else {
        console.warn(
          "⚠️ Validation: Flashcard structure missing front/back properties.",
        );
      }
    } else {
      console.warn(
        "⚠️ Validation: Response is not an array or is empty.",
      );
    }
  } catch (error) {
    console.error(
      "❌ API Test Failed:",
      error.message,
    );
  }
}

testGenerateAPI();

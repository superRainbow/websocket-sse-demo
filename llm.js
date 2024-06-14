// index.ts
import pkg from '@lmstudio/sdk';
const { LMStudioClient } = pkg;

async function main() {
  // Create a client to connect to LM Studio, then load a model
  const client = new LMStudioClient();
  const model = await client.llm.load("LM Studio Community/Meta-Llama-3-8B-Instruct-GGUF/Meta-Llama-3-8B-Instruct-Q4_K_M.gguf");

  // Predict!
  const prediction = model.respond([
    { role: "system", content: "You are a helpful AI assistant." },
    { role: "user", content: "What is the meaning of life?" },
  ]);
  for await (const text of prediction) {
    process.stdout.write(text);
  }
}

main();
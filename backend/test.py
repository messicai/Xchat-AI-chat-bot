from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

completion = client.chat.completions.create(
  model="google/gemma-7b",
  messages=[{"role":"user","content":"hi"}],
  temperature=0.5,
  top_p=1,
  max_tokens=1024,
  stream=True
)

for chunk in completion:
  if chunk.choices[0].delta.content is not None:
    print(chunk.choices[0].delta.content, end="")


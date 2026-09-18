// Thin client for TypeSafe's System One endpoint.
// One call carries every question we have about a repo, which is the cheap
// path: the state is sent once and each question is answered against it.

const ENDPOINT = process.env.TYPESAFE_BASE_URL ?? 'https://api.typesafe.ai/v1/systemone';

export const hasKey = () => Boolean(process.env.TYPESAFE_API_KEY);

export async function ask(state, questions, { model = 'jev-latest', retries = 4 } = {}) {
  if (!hasKey()) throw new Error('TYPESAFE_API_KEY is not set');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      },
      body: JSON.stringify({ model, state, questions }),
    });

    if (res.status === 429 || res.status === 529) {
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error('Jev: retries exhausted');
}

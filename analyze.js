exports.handler = async (event) => {
  const GEMINI_KEY = process.env.GEMINI_KEY;
  const type = event.queryStringParameters?.type || 'dipp';

  const PROMPTS = {
    dipp: 'Du är Akatier, en specialiserad aktieanalys-AI med fokus på S&P 500. Analysera S&P 500 just nu och hitta de 5-7 mest intressanta aktierna med dippar som kan vara köpmöjligheter. Svara ENBART med ren JSON utan markdown: {"summary":"En mening om marknadsläget","stocks":[{"ticker":"AAPL","name":"Apple Inc","signal":"köp","change":"-3.2%","reason":"Förklaring på svenska","risk":"låg"}]}. signal=köp/bevaka/undvik, risk=låg/medel/hög.',
    'köp': 'Du är Akatier, en specialiserad aktieanalys-AI med fokus på S&P 500. Hitta de 5-7 starkaste köplägena i S&P 500 just nu. Svara ENBART med ren JSON utan markdown: {"summary":"En mening om köplägen","stocks":[{"ticker":"NVDA","name":"Nvidia","signal":"köp","change":"+2.1%","reason":"Förklaring på svenska","risk":"medel"}]}.',
    sektor: 'Du är Akatier, en specialiserad aktieanalys-AI med fokus på S&P 500. Analysera vilka sektorer i S&P 500 som är starkast/svagast just nu. Svara ENBART med ren JSON utan markdown: {"summary":"En mening om sektorer","stocks":[{"ticker":"XLK","name":"Tekniksektorn","signal":"köp","change":"+1.8%","reason":"Förklaring på svenska","risk":"medel"}]}.',
    risk: 'Du är Akatier, en specialiserad aktieanalys-AI med fokus på S&P 500. Identifiera 5-7 aktier i S&P 500 med högst risk just nu. Svara ENBART med ren JSON utan markdown: {"summary":"En mening om riskläget","stocks":[{"ticker":"TSLA","name":"Tesla","signal":"undvik","change":"-1.5%","reason":"Förklaring på svenska","risk":"hög"}]}.'
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPTS[type] || PROMPTS.dipp }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Gemini HTTP ' + res.status, detail: errText }),
      };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'Kunde inte tolka analysen, försök igen.', stocks: [] }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};

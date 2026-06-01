// api/proxy.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: { message: 'Request body is missing or invalid JSON.' } });
  }

  // ── OpenAI DALL-E 이미지 생성 ──
  if (body.target === 'openai-image') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    }

    const { target, response_format, ...rest } = body;
    const isDalle3 = rest.model === 'dall-e-3';

    // dall-e-3: size 강제, n=1 고정, response_format=url로 요청 후 서버에서 b64 변환
    if (isDalle3) {
      const allowed3 = ['1024x1024', '1792x1024', '1024x1792'];
      if (!allowed3.includes(rest.size)) rest.size = '1024x1024';
      rest.n = 1;

      const openaiBody = { ...rest, response_format: 'url' };

      try {
        const r = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(openaiBody),
        });
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);

        const imageUrl = data.data?.[0]?.url;
        if (!imageUrl) {
          return res.status(500).json({ error: { message: 'DALL-E 3 URL이 없습니다.' } });
        }

        // URL → base64 변환 (프론트 CORS 우회)
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          return res.status(imgRes.status).json({ error: { message: `이미지 다운로드 실패: ${imgRes.status}` } });
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString('base64');

        // 프론트가 기존과 동일하게 data[0].b64_json 으로 받도록
        return res.status(200).json({ data: [{ b64_json: b64 }] });
      } catch (e) {
        return res.status(500).json({ error: { message: `DALL-E 3 오류: ${e.message}` } });
      }
    }

    // dall-e-2: response_format 없이 url로 요청 후 서버에서 b64 변환 (통일)
    const openaiBody2 = { ...rest, response_format: 'url' };

    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(openaiBody2),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) {
        return res.status(500).json({ error: { message: 'DALL-E 2 URL이 없습니다.' } });
      }

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return res.status(imgRes.status).json({ error: { message: `이미지 다운로드 실패: ${imgRes.status}` } });
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString('base64');

      return res.status(200).json({ data: [{ b64_json: b64 }] });
    } catch (e) {
      return res.status(500).json({ error: { message: `DALL-E 2 오류: ${e.message}` } });
    }
  }

  // ── Claude 텍스트 생성 ──
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' } });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: { message: `Anthropic 오류: ${e.message}` } });
  }
}

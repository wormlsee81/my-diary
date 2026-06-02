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

  // ── OpenAI 이미지 생성 (gpt-image-1) ──
  if (body.target === 'openai-image') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    }

    // response_format, target 제거 후 전송
    const { target, response_format, ...rest } = body;

    // gpt-image-1은 output_format으로 base64 직접 반환 가능
    const openaiBody = {
      ...rest,
      output_format: 'png',   // gpt-image-1 파라미터
    };

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

      // gpt-image-1: data[0].b64_json 또는 data[0].url 형태로 반환
      const b64 = data.data?.[0]?.b64_json;
      const url = data.data?.[0]?.url;

      if (b64) {
        // b64_json 직접 반환된 경우
        return res.status(200).json({ data: [{ b64_json: b64 }] });
      } else if (url) {
        // url로 반환된 경우 서버에서 다운로드 후 base64 변환
        const imgRes = await fetch(url);
        if (!imgRes.ok) {
          return res.status(imgRes.status).json({ error: { message: `이미지 다운로드 실패: ${imgRes.status}` } });
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return res.status(200).json({ data: [{ b64_json: base64 }] });
      } else {
        return res.status(500).json({ error: { message: '이미지 데이터가 없습니다.' } });
      }

    } catch (e) {
      return res.status(500).json({ error: { message: `이미지 생성 오류: ${e.message}` } });
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

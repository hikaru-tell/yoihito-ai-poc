import { NextResponse } from 'next/server';

// OpenAI Whisper API用
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

export const runtime = 'edge'; // Vercel Edge Functions対応（必要に応じて）

export async function POST(req: Request) {
  try {
    // multipart/form-dataで音声ファイルを受け取る
    const formData = await req.formData();
    const audioFile = formData.get('file');
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: '音声ファイルがありません' }, { status: 400 });
    }

    // Whisper APIにリクエスト
    const whisperRes = await fetch(OPENAI_WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: (() => {
        const fd = new FormData();
        fd.append('file', audioFile, 'audio.webm'); // 拡張子は適宜
        fd.append('model', 'whisper-1');
        fd.append('language', 'ja');
        return fd;
      })()
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return NextResponse.json({ error: 'Whisper APIエラー', detail: err }, { status: 500 });
    }
    const data = await whisperRes.json();
    return NextResponse.json({ text: data.text });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー', detail: String(error) }, { status: 500 });
  }
} 
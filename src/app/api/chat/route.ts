import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt } = await req.json();

    // ルート直下のdata.csvを読み込む
    const csvPath = path.join(process.cwd(), 'data.csv');
    let csvData = '';
    try {
      csvData = await fs.readFile(csvPath, 'utf-8');
    } catch (e) {
      csvData = '';
    }

    // systemPromptを強化
    let enhancedSystemPrompt = `あなたは会計仕訳AIです。ユーザーの命令文をもとに、CSVの情報を参照し、必ず下記のJSON形式で返答してください。\n【重要】勘定科目と税率は、必ずCSVに記載されているものから選択してください。CSVにないものは絶対に使わないでください。\n\n【CSVデータ】\n${csvData}\n\n【出力形式】\n{\n  "借方": {\n    "勘定科目": "...",\n    "取引先名": "...",\n    "税率": "...",\n    "金額": ...\n  },\n  "貸方": {\n    "勘定科目": "...",\n    "取引先名": "...",\n    "税率": "...",\n    "金額": ...\n  }\n}`;
    if (systemPrompt) {
      enhancedSystemPrompt = systemPrompt + '\n' + enhancedSystemPrompt;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...messages
      ],
    });

    return NextResponse.json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
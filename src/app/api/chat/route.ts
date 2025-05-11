import { NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { promises as fs } from 'fs';
import path from 'path';
import { accountMaster, taxMaster } from './masters';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
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
    let enhancedSystemPrompt = `
あなたは会計仕訳AIです。ユーザーの命令文をもとに、CSVの情報を参照し、最終的に必ず下記の完全なJSON形式で返答してください。

【重要】出力は必ず完全なJSON形式データのみとし、不足情報がある場合は絶対にJSONを出力しないでください。
【重要】情報が不足している場合は、どの項目が不足しているかを日本語でユーザーに質問し、必要な情報がすべて揃うまで何度でも質問を繰り返してください。
【重要】全ての情報が揃った時点で、初めて完全なJSON形式データのみを返してください。説明や補足は一切不要です。
【重要】勘定科目は必ず下記の勘定科目マスタから選択してください。マスタにないものは絶対に使わないでください。
【重要】税率は必ず下記の税率マスタデータから選択してください。マスタデータにないものは絶対に使わないでください。
【重要】借方と貸方で同じ情報（取引先名や税率など）が使える場合は、同じ値をセットしてください。
【重要】会計仕訳とは関係ない質問には「会計仕訳とは関係ありません」と答えてください。

【勘定科目マスタ】
${accountMaster}

【税率マスタデータ】
${taxMaster}

【CSVデータ】
${csvData}

【出力形式】
{
  "借方": {
    "勘定科目": "",
    "取引先名": "",
    "税率": "",
    "金額": ""
  },
  "貸方": {
    "勘定科目": "",
    "取引先名": "",
    "税率": "",
    "金額": ""
  }
}`;
    if (systemPrompt) {
      enhancedSystemPrompt = systemPrompt + '\n' + enhancedSystemPrompt;
    }
    const { text } = await generateText({
      model: openrouter('openai/gpt-4o'),
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...messages
      ]
    });

    // textがPromiseの場合はawaitで解決
    const resolvedText = typeof text === 'string' ? text : await text;
    let safeText = resolvedText;
    if (typeof safeText !== 'string') {
      safeText = JSON.stringify(safeText);
    }

    return NextResponse.json({ message: safeText });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Daily API key is missing' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 3600, // Room expires in 1 hour
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create room' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating Daily room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

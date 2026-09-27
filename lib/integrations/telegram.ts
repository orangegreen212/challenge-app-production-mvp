import 'server-only';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See INTEGRATIONS.md for setup steps.`);
  }
  return value;
}

export function getTelegramBotUsername(): string {
  return requireEnv('TELEGRAM_BOT_USERNAME');
}

export function buildTelegramDeepLink(code: string): string {
  const username = getTelegramBotUsername();
  return `https://t.me/${username}?start=${code}`;
}

export async function sendTelegramMessage(chatId: number | string, text: string) {
  const botToken = requireEnv('TELEGRAM_BOT_TOKEN');
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { username?: string; first_name?: string };
    text?: string;
  };
}

export function parseStartCommand(update: TelegramUpdate): {
  chatId: number;
  username?: string;
  code: string;
} | null {
  const message = update.message;
  const text = message?.text;
  if (!message || !text || !text.startsWith('/start')) return null;

  const parts = text.trim().split(/\s+/);
  const code = parts[1];
  if (!code) return null;

  return {
    chatId: message.chat.id,
    username: message.from?.username,
    code,
  };
}

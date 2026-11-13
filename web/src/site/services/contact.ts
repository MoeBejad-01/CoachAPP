// Contact form submission. MOCKED: messages are kept in this browser under
// `coachhq:contact` until a mail or CRM endpoint replaces `sendContactMessage`.

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

const KEY = 'coachhq:contact';

export async function sendContactMessage(msg: ContactMessage): Promise<void> {
  await new Promise((r) => setTimeout(r, 900));
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[];
    localStorage.setItem(KEY, JSON.stringify([...all, { ...msg, sentAt: new Date().toISOString() }]));
  } catch {
    // Storage blocked: the thank-you still shows.
  }
}

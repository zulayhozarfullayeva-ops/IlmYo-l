// IlmYo'l Telegram bot (Supabase Edge Function).
//
//   POST (from Telegram)   webhook: /start <code>, /holat, approve / return buttons, return reason
//   ?process=1             send queued rows from public.notifications
//   ?setup=1               register the webhook with Telegram and store the bot username
//
// Secret required (Supabase dashboard -> Edge Functions -> Secrets): TELEGRAM_BOT_TOKEN
// JWT verification is off because Telegram cannot send one; webhook calls are authenticated with
// Telegram's secret-token header, and the other two modes only do idempotent, non-sensitive work.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

async function webhookSecret(): Promise<string> {
  const bytes = new TextEncoder().encode(`ilmyol:${TOKEN}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

const send = (chatId: number, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

const HELP =
  "Bu IlmYo‘l boti. Akkauntingizni ulash uchun saytda <b>Sozlamalar → Telegram’ni ulash</b> tugmasini bosing.\n\n" +
  "Buyruqlar:\n/holat — mening holatim";

async function processQueue(): Promise<number> {
  let sent = 0;
  for (let round = 0; round < 3; round++) {
    const { data, error } = await sb.rpc("tg_claim_notifications", { p_limit: 30 });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const n of data) {
      const r = await send(n.chat_id, n.body, n.buttons ? { reply_markup: { inline_keyboard: n.buttons } } : {});
      await sb.rpc("tg_mark_notification", { p_id: n.id, p_ok: !!r.ok, p_error: r.ok ? null : String(r.description ?? "error") });
      if (r.ok) sent++;
    }
  }
  return sent;
}

async function setup() {
  if (!TOKEN) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN secret is not set" }, 400);
  const me = await tg("getMe", {});
  if (!me.ok) return json({ ok: false, error: "Telegram rejected the bot token" }, 400);
  const hook = await tg("setWebhook", {
    url: `${SUPABASE_URL}/functions/v1/telegram-bot`,
    secret_token: await webhookSecret(),
    allowed_updates: ["message", "callback_query"],
  });
  await tg("setMyCommands", { commands: [{ command: "holat", description: "Mening holatim" }] });
  const { error } = await sb.rpc("tg_set_bot_username", { p_username: me.result.username });
  return json({ ok: !!hook.ok && !error, bot: me.result.username, webhook: hook.description ?? null });
}

// deno-lint-ignore no-explicit-any
async function handleMessage(msg: any) {
  if (!msg?.chat || msg.chat.type !== "private") return;
  const chatId: number = msg.chat.id;
  const text: string = (msg.text ?? "").trim();
  if (!text) return;

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    if (code) {
      const { data } = await sb.rpc("tg_link", { p_code: code, p_chat_id: chatId });
      if (data) {
        await send(chatId, `✅ Ulandi: <b>${escapeHtml(data)}</b>\n\nEndi muddat eslatmalari va tekshiruv xabarlari shu yerga keladi.\n/holat — mening holatim`);
      } else {
        await send(chatId, "Bu havola eskirgan yoki allaqachon ishlatilgan. Saytda <b>Sozlamalar → Telegram’ni ulash</b> tugmasini qayta bosing.");
      }
      return;
    }
    const { data } = await sb.rpc("tg_status", { p_chat_id: chatId });
    await send(chatId, data ? `Akkauntingiz ulangan.\n\n${data}` : HELP);
    return;
  }

  if (text.startsWith("/holat")) {
    const { data } = await sb.rpc("tg_status", { p_chat_id: chatId });
    await send(chatId, data ?? HELP);
    return;
  }

  const { data } = await sb.rpc("tg_reply", { p_chat_id: chatId, p_text: text });
  if (data?.saved) {
    await send(chatId, `💬 Izoh saqlandi va doktorantga yuborildi.\n«${escapeHtml(data.title)}»`);
  } else {
    await send(chatId, data?.linked ? "Buyruqlar:\n/holat — mening holatim" : HELP);
  }
}

// deno-lint-ignore no-explicit-any
async function handleCallback(cq: any) {
  const chatId: number = cq.from.id;
  const [action, planId] = String(cq.data ?? "").split(":");
  if (!["a", "r"].includes(action) || !planId) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id });
    return;
  }
  const { data, error } = await sb.rpc("tg_review", { p_chat_id: chatId, p_plan: planId, p_action: action });
  if (error || !data?.ok) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: data?.message ?? "Xatolik yuz berdi", show_alert: true });
    if (cq.message) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: cq.message.message_id });
    return;
  }
  const approved = data.status === "approved";
  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: approved ? "Tasdiqlandi" : "Qaytarildi" });
  if (cq.message) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: cq.message.message_id });
  if (approved) {
    await send(chatId, `✅ Tasdiqladingiz: «${escapeHtml(data.title)}»\n${escapeHtml(data.student)} ga xabar yuborildi.`);
  } else {
    await send(chatId, `↩️ Qaytardingiz: «${escapeHtml(data.title)}»\n\nSababini shu xabarga javob qilib yozing — doktorant uni izoh sifatida ko‘radi.`, {
      reply_markup: { force_reply: true, input_field_placeholder: "Qaytarish sababi..." },
    });
  }
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  try {
    if (url.searchParams.has("setup")) return await setup();
    if (!TOKEN) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN secret is not set" });
    if (url.searchParams.has("process")) return json({ ok: true, sent: await processQueue() });

    if (req.method !== "POST") return json({ ok: true, service: "ilmyol-telegram-bot" });
    if (req.headers.get("x-telegram-bot-api-secret-token") !== await webhookSecret()) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    const update = await req.json();
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
    await processQueue();
    return json({ ok: true });
  } catch (err) {
    console.error("telegram-bot error", err);
    // Always 200 for Telegram so it does not retry the same update forever.
    return json({ ok: false });
  }
});

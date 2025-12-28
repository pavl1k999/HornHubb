const TelegramBot = require('node-telegram-bot-api');

// ВСТАВЬ СЮДА
const BOT_TOKEN = '8558152282:AAEMe8XfKCRO7f8I1olp10uzyLzHeXltryU';
const MINI_APP_URL = 'https://pavl1k999.github.io/HornHubb/'; // где лежит index.html

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendPhoto(
    chatId,
    'https://pavl1k999.github.io/HornHubb/images/banner.png',
    {
      caption:
`👋 Добро пожаловать в Vape Shop

🛒 Одноразки • Жидкости • Картриджи
⚡ Заказ прямо в Telegram

Нажмите кнопку ниже 👇`,
      reply_markup: {
        keyboard: [[
          {
            text: '🛍 Открыть магазин',
            web_app: { url: MINI_APP_URL }
          }
        ]],
        resize_keyboard: true
      }
    }
  );
});




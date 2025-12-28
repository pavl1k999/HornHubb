const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8558152282:AAEMe8XfKCRO7f8I1olp10uzyLzHeXltryU';
const MINI_APP_URL = 'https://pavl1k999.github.io/HornHubb/'; // где лежит index.html

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendPhoto(
    msg.chat.id,
    'https://your-domain.com/images/banner.png',
    {
      caption: 'Добро пожаловать в HORN HUB 🔥\nОткройте магазин ниже',
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


from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackContext

# Вставь сюда свой токен
BOT_TOKEN = "8558152282:AAEMe8XfKCRO7f8I1olp10uzyLzHeXltryU"
MINI_APP_URL = "https://pavl1k999.github.io/HornHubb/"

def start(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id

    keyboard = [
        [InlineKeyboardButton("🛍 Открыть магазин", url=MINI_APP_URL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    context.bot.send_photo(
        chat_id=chat_id,
        photo="https://pavl1k999.github.io/HornHubb/images/banner.png",
        caption=(
            "👋 Добро пожаловать в Vape Shop\n\n"
            "🛒 Одноразки • Жидкости • Картриджи\n"
            "⚡ Заказ прямо в Telegram\n\n"
            "Нажмите кнопку ниже 👇"
        ),
        reply_markup=reply_markup
    )

def main():
    updater = Updater(BOT_TOKEN, use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))

    print("Бот запущен...")
    updater.start_polling()
    updater.idle()

if __name__ == "__main__":
    main()

# Clean Sweep

ВОт план разработки начни с главной страницы остальные страницы сделаем после. задай вопросы перед началом Роль: Ты Senior Full-Stack разработчик (React, Tailwind CSS, Supabase, Shadcn UI). Твоя задача — создать MVP маркетплейса клининговых услуг (Uber-модель). Платформа соединяет клиентов (B2C), владельцев посуточной аренды (B2B) и исполнителей (клинеров).

Дизайн-система: Минимализм, чистые интерфейсы, как у современных сервисов такси или доставки. Основные цвета: белый, светло-серый фон, акцентный цвет (например, глубокий синий или свежий зеленый) для кнопок целевого действия.

Глобальная Архитектура Базы Данных (Supabase): Создай структуру таблиц:

Users: id, role (client, host, cleaner, admin), phone, name, avatar_url, public_rating (float), internal_karma (int, default 100), balance (decimal).

Orders: id, client_id, cleaner_id, type (b2c_regular, b2b_host), status (new, assigned, in_progress, awaiting_approval, disputed, completed), price, commission, created_at, scheduled_for, before_photos (text[]), after_photos (text[]), checklist_completed (boolean).

Host_Inventory: id, host_id, item_name, quantity, min_required.

Ролевая модель и Маршрутизация (Pages):

Раздел 1: Роль "Client" (B2C - Обычные пользователи)

Страница /client/new-order (Умный Калькулятор):

Шаг 1: Выбор количества комнат и санузлов (влияет на базовую цену).

Шаг 2: Чекбоксы дополнительных услуг с ценами (внутри холодильника, духовка, окна).

Шаг 3: Выбор частоты (разовая уборка или подписка со скидкой 15%).

Шаг 4: Вывод итоговой стоимости и кнопка "Оформить заказ".

Страница /client/orders: Список активных и прошлых заказов. Если заказ в статусе awaiting_approval, покажи фото-отчет от клинера и две кнопки: "Подтвердить" и "Открыть спор (Есть претензии)".

Раздел 2: Роль "Host" (B2B - Владельцы посуточных квартир)

Страница /host/new-order:

Фиксированный тариф "Срочная уборка".

Обязательный выбор таймслота (строго окно между 12:00 и 14:00).

Поле для комментария (например, "Код от сейфа 1234").

Страница /host/inventory: Простая таблица-дашборд остатков расходников (туалетная бумага, шампуни, чай).

Раздел 3: Роль "Cleaner" (Исполнитель)

Страница /cleaner/board (Канбан-доска):

Колонка 1: "Доступные заказы" (список новых заявок, кнопка "Взять в работу").

Колонка 2: "Мои заказы" (актуальные). При клике открывается карточка заказа.

Внутри карточки заказа (Логика выполнения):

Если тип заказа b2b_host: Перед стартом работы клинер обязан загрузить 4 фото состояния квартиры ("До") и нажать чекбокс "Ущерба нет". Без этого кнопка "Начать уборку" заблокирована.

В процессе уборки отображается To-Do лист (чекбокс-список задач).

Завершение: Обязательная загрузка фото-отчета ("После").

Если тип b2b_host: Появление формы ввода остатков инвентаря (обновляет таблицу Host_Inventory).

Страница /cleaner/profile: Отображение баланса (замороженные средства и доступные к выводу), кнопка "Запросить вывод", рейтинг (звезды) и прогресс-бар Карма-счета.

Раздел 4: Роль "Admin" (Ручной финансовый шлюз и Арбитраж)

Страница /admin/finance: Список клинеров, запросивших вывод средств. Кнопка "Отметить выплаченным" (списывает доступный баланс).

Страница /admin/disputes:

Список заказов со статусом disputed.

Сплит-экран: слева фото отчета клинера, справа фото и комментарий претензии клиента.

Три кнопки резолюции:

"Вернуть на доработку" (статус in_progress).

"Прав клиент" (возврат денег, штраф -20 баллов Кармы клинеру).

"Прав клинер" (завершить заказ в пользу клинера, блок отзыва клиента).

Технические требования к Lovable:

Реализуй все состояния UI (loading, success, error).

Сделай интерфейс Mobile-First, так как клинеры и клиенты будут использовать платформу со смартфонов.

Используй mock-данные (заглушки) для демонстрации работы доски клинера и админ-панели, если база данных пуста.

Создай компонент загрузки изображений с UI-индикатором прогресса (пока без реальной интеграции бакета, просто UI-имитация).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://neat-place-now.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be5f4cbe-1847-443d-a360-ef64591b5090).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

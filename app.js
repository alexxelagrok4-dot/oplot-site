import { company, systems } from './config.js';
import { validContact, leadText } from './lead.js';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
$$('[data-brand]').forEach(el => el.textContent = company.name);
$$('[data-descriptor]').forEach(el => el.textContent = company.descriptor);
// Телефон и почта уже размечены ссылками в HTML; сюда выводятся только реквизиты.
if (company.legalName) $('#company-details').textContent = company.legalName;
const contacts = `Телефон: ${company.phone}\nПочта: ${company.email}`;

const header = $('.header');
const menuToggle = $('.menu-toggle');
function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open)); $('#mobile-nav').hidden = !open;
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); header.classList.toggle('menu-open', open);
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
$$('#mobile-nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
const updateHeader = () => { header.classList.toggle('is-scrolled', window.scrollY > 40); document.body.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.6); };
window.addEventListener('scroll', updateHeader, { passive: true }); updateHeader();

// Плавное появление блоков; без IntersectionObserver всё видно сразу.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; observer.observe(el); });
} else $$('.reveal').forEach(el => el.classList.add('is-visible'));

// Точки на схеме и пункты списка подсвечивают друг друга.
function highlightSpot(spot) { $$('[data-spot]').forEach(el => el.classList.toggle('is-active', el.dataset.spot === spot)); }
$$('#anatomy [data-spot]').forEach(el => {
  el.addEventListener('mouseenter', () => highlightSpot(el.dataset.spot));
  el.addEventListener('focus', () => highlightSpot(el.dataset.spot));
  el.addEventListener('click', () => highlightSpot(el.dataset.spot));
});
$('#anatomy').addEventListener('mouseleave', () => highlightSpot(null));

function downloadLead(lead) {
  const blob = new Blob(['\uFEFF' + leadText(lead)], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a'); const url = URL.createObjectURL(blob);
  link.href = url; link.download = 'oplot-zayavka-draft.txt'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let formStep = 1; let completedLead = {};
const form = $('#estimate-form');
function renderFormStep(focus = true) {
  $$('[data-step]').forEach(el => el.hidden = Number(el.dataset.step) !== formStep);
  $('#step-caption').textContent = `ШАГ ${formStep} ИЗ 3`;
  $$('.form-progress i').forEach((el, index) => el.classList.toggle('active', index < formStep));
  $('#form-back').hidden = formStep === 1;
  $('#form-next').replaceChildren(document.createTextNode(formStep === 3 ? 'Подготовить заявку ' : 'Продолжить '));
  const arrow = document.createElement('span'); arrow.textContent = '→'; $('#form-next').append(arrow);
  $('#form-error').textContent = '';
  if (focus) { const legend = $(`[data-step="${formStep}"] legend`); legend.tabIndex = -1; legend.focus({ preventScroll: true }); }
}
form.addEventListener('submit', event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(form));
  let message = ''; let focusTarget;
  if (formStep === 1 && !data.object) { message = 'Выберите тип объекта.'; focusTarget = $('input[name="object"]'); }
  else if (formStep === 1 && !data.region.trim()) { message = 'Укажите город или регион.'; focusTarget = $('#region'); }
  else if (formStep === 3 && !data.name.trim()) { message = 'Укажите, как к вам обращаться.'; focusTarget = $('#name'); }
  else if (formStep === 3 && !validContact(data.contact)) { message = 'Введите телефон с кодом города или адрес электронной почты.'; focusTarget = $('#contact'); }
  if (message) { $('#form-error').textContent = message; focusTarget.focus(); return; }
  if (formStep < 3) { formStep++; renderFormStep(); return; }
  completedLead = data; form.hidden = true; $('#form-success').hidden = false;
  $('#lead-summary').textContent = leadText(data); $('#download-lead').focus({ preventScroll: true });
});
$('#form-back').addEventListener('click', () => { if (formStep > 1) formStep--; renderFormStep(); });
$('#download-lead').addEventListener('click', () => downloadLead(completedLead));
$('#restart-form').addEventListener('click', () => { form.reset(); completedLead = {}; form.hidden = false; $('#form-success').hidden = true; formStep = 1; renderFormStep(); });

const dialog = $('#info-dialog');
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
$$('[data-system]').forEach(button => button.addEventListener('click', () => {
  const system = systems[button.dataset.system]; const content = $('#dialog-content'); content.replaceChildren();
  const eyebrow = document.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = `${system.number} / ${system.label}`;
  const title = document.createElement('h2'); title.textContent = system.title;
  const description = document.createElement('p'); description.textContent = system.description;
  const list = document.createElement('ul'); system.points.forEach(point => { const li = document.createElement('li'); li.textContent = point; list.append(li); });
  const note = document.createElement('p'); note.className = 'dialog-note'; note.textContent = system.note;
  const action = document.createElement('button'); action.className = 'button button-accent'; action.textContent = 'Обсудить эту систему →';
  action.addEventListener('click', () => { dialog.close(); openChat(); chatStage = null; chatLead = {}; pendingSystem = `Интересует система: ${system.title}`; addMessage(`Интересуют ${system.title.toLowerCase()}.`, 'user'); addMessage(`${system.description}\nМожем подготовить черновик заявки с этим пожеланием.`); setOptions(['Подготовить заявку', 'Сколько стоит?', 'Какие нужны данные?']); });
  content.append(eyebrow, title, description, list, note, action); dialog.showModal();
}));
$('#open-privacy').addEventListener('click', () => {
  $('#dialog-content').innerHTML = '<div class="eyebrow">О ДАННЫХ</div><h2>Ваши данные в черновике</h2><p>Форма и чат работают в браузере. Введённые сведения не отправляются на сервер, не записываются в cookies или постоянное хранилище. При перезагрузке страницы они исчезнут.</p><p>Кнопка «Скачать заявку» сохраняет текстовый файл на ваше устройство. Чат использует заранее подготовленные ответы, подключение к оператору и ИИ-сервису отсутствует.</p><p>Для шрифта браузер обращается к Google Fonts. Формы и сообщения при этом не передаются. Аналитика в этой версии не подключена.</p><p>Перед публичным запуском необходимо добавить реквизиты оператора данных, политику обработки, необходимые согласия и защищённый приём заявок.</p>';
  dialog.showModal();
});

const chat = $('#chat-panel'); const messages = $('#chat-messages');
let chatStarted = false; let chatStage = null; let chatLead = {}; let pendingSystem = ''; let leadSystemNote = ''; let chatOpener = $('#chat-launcher');
function openChat(event) {
  if (chat.hidden) chatOpener = event?.currentTarget || document.activeElement;
  chat.hidden = false; $('#chat-launcher').setAttribute('aria-expanded', 'true');
  if (!chatStarted) { chatStarted = true; welcome(); }
  // Focusing the close button avoids opening the mobile keyboard before an option is chosen.
  $('#chat-close').focus({ preventScroll: true });
}
function closeChat() { chat.hidden = true; $('#chat-launcher').setAttribute('aria-expanded', 'false'); (chatOpener?.isConnected ? chatOpener : $('#chat-launcher')).focus({ preventScroll: true }); }
$$('[data-open-chat]').forEach(button => button.addEventListener('click', openChat));
$('#chat-launcher').addEventListener('click', event => chat.hidden ? openChat(event) : closeChat());
$('#chat-close').addEventListener('click', closeChat);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !chat.hidden && !dialog.open) closeChat(); });
function addMessage(text, role = 'bot') {
  const bubble = document.createElement('div'); bubble.className = `chat-message ${role}`; bubble.textContent = text; messages.append(bubble);
  requestAnimationFrame(() => messages.scrollTop = messages.scrollHeight);
}
function setOptions(options) {
  const container = $('#chat-options'); container.replaceChildren();
  options.forEach(option => { const button = document.createElement('button'); button.type = 'button'; button.textContent = option; button.addEventListener('click', () => handleMessage(option)); container.append(button); });
}
function welcome() { addMessage(`Здравствуйте! Я помощник ОПЛОТ. Помогу разобраться в решениях и подготовить заявку.\n\nЭто демо: я отвечаю на типовые вопросы, а готовую заявку можно скачать. Быстрее всего — позвонить или прислать фото объекта:\n${contacts}`); setOptions(['Подготовить заявку', 'Выбрать систему', 'Сколько стоит?', 'Какие нужны данные?']); }
const stages = [
  { key: 'object', question: 'Какой объект нужно защитить? Можно выбрать вариант или написать свой.', options: ['Промышленный объект', 'Склад / логистика', 'Объект инфраструктуры', 'Другой объект'] },
  { key: 'region', question: 'В каком городе или регионе находится объект?', options: [] },
  { key: 'scope', question: 'Что вам нужно?', options: ['Леса под ключ: поставка и монтаж', 'Только поставка лесов', 'Проект производства работ (ППР)', 'Нужна консультация'] },
  { key: 'details', question: 'Есть ли примерные размеры, сроки или пожелания? Не указывайте конфиденциальные сведения. Этот шаг можно пропустить.', options: ['Пропустить'] },
  { key: 'name', question: 'Как к вам обращаться?', options: [] },
  { key: 'contact', question: 'Укажите телефон или электронную почту для черновика. Контакт никуда не отправляется.', options: [] },
];
function askStage() { const stage = stages[chatStage]; addMessage(stage.question); setOptions([...stage.options, ...(chatStage > 0 ? ['Назад'] : []), 'Отменить заявку']); $('#chat-input').placeholder = stage.key === 'contact' ? 'Телефон или email…' : 'Напишите ответ…'; }
function startLead() { leadSystemNote = pendingSystem; chatLead = pendingSystem ? { details: pendingSystem } : {}; pendingSystem = ''; chatStage = 0; askStage(); }
const faqAnswers = [
  { match: /цен|стоим|бюджет|сколько|дешев/, text: `Цена зависит от размеров объекта и состава работ. Пришлите фото и примерные размеры — коммерческое предложение подготовим в течение 15 минут.\n${contacts}` },
  { match: /срок|быстро|долго|когда|ппр/, text: 'На вопросы отвечаем сразу, коммерческое предложение — в течение 15 минут. Проект производства работ (ППР) — 2–4 дня. Срок отгрузки и монтажа согласуем под ваш объект.' },
  { match: /систем|выбрать|рамн|фасад|хомут|каплок|cuplock|чашеч|клинов/, text: 'Основное решение — рамные леса по типу фасадных: рамы и связи по периметру объекта, защитная сетка по стенам и кровле.\n\nДля объектов сложной формы есть дополнительные системы:\n• хомутовые — под сложную геометрию;\n• чашечные CUPLOCK — для повторяющихся участков;\n• клиновые — для пространственных каркасов.' },
  { match: /данн|чертеж|чертёж|документ|фото|выезд/, text: `Чертежи на старте не нужны: часто достаточно фото и примерных размеров объекта. Если нужен выезд — он бесплатный.\n\nФото удобнее прислать на почту ${company.email}.` },
  { match: /останов|монтаж|установ/, text: 'Монтируем по согласованию сроков. Порядок работ и доступ к площадке закладываются в ППР и согласуются с эксплуатацией.' },
  { match: /гарант|защит|эффектив|сертификат|норм|видео|опыт/, text: 'Опыт подтверждаем фото и видео выполненных объектов, в том числе видео того, как защита сработала. Покажем по запросу.\n\nХарактеристики конкретного ограждения фиксируются в документации под ваш объект; универсальную защиту от любых воздействий мы не заявляем.' },
  { match: /оператор|человек|менеджер|связ|телефон|позвон|почт/, text: `Свяжитесь с нами напрямую — отвечаем сразу:\n${contacts}\n\nЧат на сайте пока работает в демо-режиме и не передаёт сообщения.` },
  { match: /регион|достав|город|росси|отгруз/, text: 'Работаем во всех регионах: комплект лесов отгружаем в любой регион, монтаж — по согласованию сроков.' },
  { match: /привет|здравств|добрый/, text: 'Здравствуйте! Могу рассказать о системах, исходных данных и порядке работы или подготовить черновик заявки.' },
  { match: /спасибо|благодар/, text: 'Пожалуйста! Если захотите описать объект, помогу собрать всё в один черновик.' },
];
function handleMessage(raw) {
  const text = raw.trim(); if (!text) return;
  if (text === 'Скачать заявку' && chatStage === null && chatLead.contact && validContact(chatLead.contact)) { downloadLead(chatLead); addMessage('Черновик подготовлен для скачивания. Он не отправлен в компанию.'); return; }
  addMessage(text, 'user');
  if (text === 'Отменить заявку') { chatStage = null; chatLead = {}; pendingSystem = ''; $('#chat-input').placeholder = 'Напишите вопрос…'; addMessage('Подготовка заявки отменена. Могу ответить на типовой вопрос.'); setOptions(['Подготовить заявку', 'Выбрать систему', 'Сколько стоит?']); return; }
  if (chatStage !== null) {
    if (text === 'Назад' && chatStage > 0) { chatStage--; askStage(); return; }
    const stage = stages[chatStage];
    const isQuestion = /\?|^(?:а\s+)?(?:сколько|как|какие|какой|когда|где|можно ли|нужно ли|есть ли|подскажите|расскажите)(?:\s|$)/i.test(text);
    if (isQuestion && !stage.options.includes(text)) {
      const answer = faqAnswers.find(item => item.match.test(text.toLowerCase()));
      addMessage(answer?.text || 'На этот вопрос у меня пока нет готового ответа. Его можно включить в комментарий к заявке для дальнейшего обсуждения.');
      addMessage('Продолжим с того же шага. Ваши предыдущие ответы сохранены в текущем диалоге.');
      askStage(); return;
    }
    if (stage.key === 'contact' && !validContact(text)) { addMessage('Проверьте контакт: нужен телефон с кодом города (10–15 цифр) или email, например name@company.ru.'); return; }
    if (stage.key === 'details') chatLead.details = [leadSystemNote, text === 'Пропустить' ? '' : text].filter(Boolean).join('; ');
    else chatLead[stage.key] = text;
    chatStage++;
    if (chatStage === stages.length) { chatStage = null; $('#chat-input').placeholder = 'Напишите вопрос…'; addMessage(leadText(chatLead)); addMessage('Готово. Скачайте черновик заявки, чтобы сохранить его. Данные исчезнут при перезагрузке страницы.'); setOptions(['Скачать заявку', 'Подготовить новую заявку']); }
    else askStage();
    return;
  }
  if (/подготовить новую/i.test(text)) { chatLead = {}; startLead(); return; }
  if (/подготовить заявку|оформить|оставить заявку|рассчита|расчет|расчёт|хочу заказать/i.test(text)) { startLead(); return; }
  const answer = faqAnswers.find(item => item.match.test(text.toLowerCase()));
  addMessage(answer?.text || 'Я пока отвечаю на типовые вопросы о конструкциях, стоимости, документах и монтаже. На этот вопрос готового ответа нет. Его можно добавить в комментарий к черновику заявки.');
  setOptions(['Подготовить заявку', 'Выбрать систему', 'Какие нужны данные?']);
}
$('#chat-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#chat-input'); const value = input.value; input.value = ''; handleMessage(value); });
$('#chat-reset').addEventListener('click', () => { chatStage = null; chatLead = {}; pendingSystem = ''; leadSystemNote = ''; messages.replaceChildren(); $('#chat-input').value = ''; $('#chat-input').placeholder = 'Напишите вопрос…'; welcome(); });

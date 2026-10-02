export function validContact(value) {
  const text = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
  const digits = text.replace(/\D/g, '');
  return /^[+\d\s()\-]+$/.test(text) && digits.length >= 10 && digits.length <= 15;
}
export function leadText(lead) {
  const labels = { object: 'Тип объекта', region: 'Регион', scope: 'Состав работ', details: 'Комментарий', name: 'Имя', contact: 'Контакт' };
  return 'ОПЛОТ — черновик заявки\n\n' + Object.entries(labels).map(([key, label]) => `${label}: ${lead[key] || 'Не указано'}`).join('\n') + '\n\nЭто черновик. Заявка не отправлена.';
}

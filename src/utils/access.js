// Mensagens de acesso negado (Fase 40): explicam o motivo sem revelar nenhum dado do registro protegido.
const SUBJECTS = { order: 'este comprovante', booking: 'esta reserva' };

export function getAccessMessage(access, kind = 'order') {
  const subject = SUBJECTS[kind] || 'este conteúdo';
  if (access === 'login_required') return `Entre com a conta usada na compra para ver ${subject}.`;
  if (access === 'forbidden') return `Por segurança, ${subject} só pode ser visto pela conta ou pelo navegador que o criou.`;
  return kind === 'booking' ? 'Não encontramos esta reserva.' : 'Não foi possível encontrar este pedido.';
}

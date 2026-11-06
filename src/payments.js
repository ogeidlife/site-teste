'use strict';
// ESTRUTURA PARA MERCADO PAGO (não ativa). Nenhum pagamento é simulado: enquanto MP_ACCESS_TOKEN estiver vazio,
// o site só recebe "solicitações de encomenda" e o artista combina o pagamento diretamente.
//
// Para ativar no futuro:
//  1. Crie uma aplicação em https://www.mercadopago.com.br/developers e copie o Access Token (produção).
//  2. Defina no ambiente: MP_ACCESS_TOKEN=APP_USR-...   e   SITE_URL=https://seudominio.com.br
//  3. Em src/public.js (POST /encomenda), após gravar a encomenda, chame createPreference(order) e redirecione
//     o cliente para `init_point`. A coluna orders.payment_ref já existe para guardar o id da preferência.
//  4. Crie a rota POST /webhooks/mercadopago para receber a confirmação e mudar o status da encomenda
//     (ex.: "pagamento" → "producao"). Valide sempre o pagamento consultando a API (GET /v1/payments/{id}).
const enabled = () => Boolean(process.env.MP_ACCESS_TOKEN);
async function createPreference(order) {
  if (!enabled()) throw new Error('Mercado Pago não configurado (MP_ACCESS_TOKEN ausente).');
  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: order.product_name, quantity: order.qty, currency_id: 'BRL', unit_price: order.unit_price }],
      external_reference: String(order.id),
      back_urls: { success: `${process.env.SITE_URL}/encomenda/enviada`, failure: `${process.env.SITE_URL}/catalogo`, pending: `${process.env.SITE_URL}/encomenda/enviada` },
      notification_url: `${process.env.SITE_URL}/webhooks/mercadopago`, auto_return: 'approved' }) });
  if (!r.ok) throw new Error('Mercado Pago: ' + r.status);
  return r.json(); // { id, init_point, ... }
}
module.exports = { enabled, createPreference };

/* Servidor de IA de Asistente Financiero (Cloudflare Worker).
   El teléfono NUNCA lleva la clave de Anthropic: vive aquí, como secreto (ANTHROPIC_API_KEY).
   Solo hace una cosa: entender una frase libre ("le pagué al maestro 40 y compré cemento 25") y devolverla como gastos/ingresos.
   La app igual valida todo lo que devuelve este servidor (categorías y montos) y, si algo falla, se queda con su lector local.

   Configuración (todo en wrangler.toml o con `wrangler secret put`):
     ANTHROPIC_API_KEY   (secreto, obligatorio)
     MODELO              (obligatorio; sale de PLAN.ia.modelo al publicar el Worker, no se escribe aquí)
     ORIGENES            (opcional; orígenes permitidos separados por coma)
     LIMITE_DIARIO       (opcional; sale de PLAN.ia.limiteDiarioApp; necesita el KV "CONTADOR") */

const ORIGENES_POR_DEFECTO = ['https://localhost', 'http://localhost', 'capacitor://localhost'];
const MAX_TEXTO = 500;

const cabecerasBase = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const responder = (cuerpo, estado, extra) => new Response(JSON.stringify(cuerpo), { status: estado || 200, headers: Object.assign({}, cabecerasBase, extra || {}) });

function origenPermitido(req, env) {
  const origen = req.headers.get('Origin');
  if (!origen) return null;                                   // la app nativa envía su origen; sin origen no se responde a navegadores curiosos
  const lista = env.ORIGENES ? String(env.ORIGENES).split(',').map((x) => x.trim()).filter(Boolean) : ORIGENES_POR_DEFECTO;
  return lista.includes(origen) ? origen : null;
}

/* ---- validación de lo que manda la app (nunca se confía en el cuerpo tal cual) */
function validar(c) {
  if (!c || typeof c !== 'object') return null;
  const texto = typeof c.texto === 'string' ? c.texto.trim().slice(0, MAX_TEXTO) : '';
  if (!texto) return null;
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(c.hoy || '') ? c.hoy : new Date().toISOString().slice(0, 10);
  const cat = (Array.isArray(c.categorias) ? c.categorias : []).slice(0, 80)
    .filter((x) => x && typeof x.id === 'string' && typeof x.nombre === 'string' && (x.tipo === 'gasto' || x.tipo === 'ingreso'))
    .map((x) => ({ id: x.id.slice(0, 40), nombre: x.nombre.slice(0, 60), tipo: x.tipo }));
  if (!cat.length) return null;
  return { texto, hoy, moneda: String(c.moneda || 'USD').slice(0, 5), pais: String(c.pais || '').slice(0, 3), categorias: cat };
}

function instrucciones(c) {
  return [
    'Eres el lector de frases de una app de finanzas personales en español (Ecuador y Latinoamérica).',
    'La persona dice o escribe lo que gastó o ganó. Conviértelo en movimientos usando SOLO estas categorías (campo "cat" = id exacto):',
    c.categorias.map((x) => '- ' + x.id + ' (' + x.tipo + '): ' + x.nombre).join('\n'),
    'Reglas: "monto" es un número positivo en ' + c.moneda + ' (sin símbolos). "tipo" es "gasto" o "ingreso" y debe coincidir con el tipo de la categoría.',
    '"fecha" es YYYY-MM-DD; hoy es ' + c.hoy + ' (si dice "ayer", "el lunes", etc., calcula la fecha; si no dice nada, usa hoy). "desc" es una descripción corta (máx. 40 letras).',
    'No inventes montos ni movimientos que la frase no diga. Si la frase no trae ningún monto, llama a la herramienta con "items" vacío.',
  ].join('\n');
}

const HERRAMIENTA = {
  name: 'registrar',
  description: 'Entrega los movimientos que dijo la persona.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array', maxItems: 10,
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
            monto: { type: 'number' },
            cat: { type: 'string' },
            desc: { type: 'string' },
            fecha: { type: 'string' },
          },
          required: ['tipo', 'monto', 'cat'],
        },
      },
    },
    required: ['items'],
  },
};

/* ---- tope diario para toda la app (opcional): protege el gasto si alguien abusara del servidor */
async function dentroDelTope(env) {
  const tope = parseInt(env.LIMITE_DIARIO, 10);
  if (!tope || !env.CONTADOR) return true;
  const clave = 'dia:' + new Date().toISOString().slice(0, 10);
  const n = parseInt((await env.CONTADOR.get(clave)) || '0', 10);
  if (n >= tope) return false;
  await env.CONTADOR.put(clave, String(n + 1), { expirationTtl: 172800 });
  return true;
}

export async function interpretar(cuerpo, env, llamar) {
  if (!env.MODELO) return { estado: 500, cuerpo: { error: 'falta_modelo' } };
  const c = validar(cuerpo);
  if (!c) return { estado: 400, cuerpo: { error: 'datos_invalidos' } };
  if (!(await dentroDelTope(env))) return { estado: 429, cuerpo: { error: 'tope_diario' } };
  let r;
  try {
    r = await (llamar || fetch)('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: env.MODELO, max_tokens: 600, system: instrucciones(c),
        tools: [HERRAMIENTA], tool_choice: { type: 'tool', name: 'registrar' },
        messages: [{ role: 'user', content: c.texto }],
      }),
    });
  } catch (e) { return { estado: 502, cuerpo: { error: 'sin_conexion_ia' } }; }
  if (!r.ok) return { estado: 502, cuerpo: { error: 'ia_respondio_error', codigo: r.status } };
  let j;
  try { j = await r.json(); } catch (e) { return { estado: 502, cuerpo: { error: 'respuesta_ilegible' } }; }
  const uso = (j.content || []).find((x) => x && x.type === 'tool_use' && x.name === 'registrar');
  const items = uso && uso.input && Array.isArray(uso.input.items) ? uso.input.items : [];
  const ids = new Map(c.categorias.map((x) => [x.id, x.tipo]));
  const limpios = items
    .filter((i) => i && Number(i.monto) > 0 && Number(i.monto) < 1e9 && (i.tipo === 'gasto' || i.tipo === 'ingreso') && ids.get(i.cat) === i.tipo)
    .slice(0, 10)
    .map((i) => ({
      tipo: i.tipo, monto: Math.round(Number(i.monto) * 100) / 100, cat: i.cat, desc: String(i.desc || '').slice(0, 60),
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(i.fecha || '') ? i.fecha : c.hoy,
    }));
  if (!limpios.length) return { estado: 422, cuerpo: { error: 'sin_movimientos' } };   // la app sigue con su lector local
  return { estado: 200, cuerpo: { tipo: 'registrar', items: limpios } };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = origenPermitido(req, env);
    const cors = origen ? { 'Access-Control-Allow-Origin': origen, Vary: 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: Object.assign({ 'Access-Control-Allow-Methods': 'POST, GET', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }, cors) });
    }
    if (req.method === 'GET' && url.pathname === '/salud') return responder({ ok: true, modelo: env.MODELO || null, clave: !!env.ANTHROPIC_API_KEY }, 200, cors);
    if (req.method !== 'POST' || url.pathname !== '/interpretar') return responder({ error: 'no_encontrado' }, 404, cors);
    if (!origen) return responder({ error: 'origen_no_permitido' }, 403);
    if (!env.ANTHROPIC_API_KEY) return responder({ error: 'falta_clave' }, 500, cors);
    const largo = parseInt(req.headers.get('Content-Length') || '0', 10);
    if (largo > 20000) return responder({ error: 'cuerpo_muy_grande' }, 413, cors);
    let cuerpo = null;
    try { cuerpo = JSON.parse(await req.text()); } catch (e) { return responder({ error: 'json_invalido' }, 400, cors); }
    const r = await interpretar(cuerpo, env);
    return responder(r.cuerpo, r.estado, cors);
  },
};

import crypto from 'node:crypto';

import {
  getJSON,
  putJSON,
  json,
  requireAdmin,
  getSettings,
  store
} from './_lib.mjs';

async function products() {
  return getJSON(
    'sapucaia-data',
    'products',
    []
  );
}

async function orderIds() {
  return getJSON(
    'sapucaia-data',
    'orders-index',
    []
  );
}

async function customers() {
  return getJSON(
    'sapucaia-data',
    'customers',
    []
  );
}

async function orders() {
  const ids = await orderIds();

  const out = [];

  for (const id of Array.isArray(ids) ? ids : []) {
    const order = await getJSON(
      'sapucaia-data',
      `order-${id}`,
      null
    );

    if (order) {
      out.push(order);
    }
  }

  return out;
}

function normalizeProduct(incoming = {}) {
  const product = {
    ...incoming,

    id: String(
      incoming.id ||
      crypto.randomUUID()
    ),

    name: String(
      incoming.name || ''
    ).trim(),

    cat: String(
      incoming.cat || ''
    ).trim(),

    price: Number(
      incoming.price || 0
    ),

    old: Number(
      incoming.old || 0
    ),

    tag: String(
      incoming.tag || ''
    ).trim(),

    desc: String(
      incoming.desc || ''
    ).trim(),

    validityType:
      ['days', 'wipe', 'permanent'].includes(
        incoming.validityType
      )
        ? incoming.validityType
        : 'permanent',

    validityDays:
      Number.isFinite(
        Number(incoming.validityDays)
      )
        ? Math.max(
            1,
            Math.floor(
              Number(incoming.validityDays)
            )
          )
        : 30,

    valid: String(
      incoming.valid || 'Até o wipe'
    ),

    published: true,

    updatedAt:
      new Date().toISOString()
  };

  product.images =
    Array.isArray(incoming.images)
      ? [
          ...new Set(
            incoming.images
              .map(x =>
                String(x || '').trim()
              )
              .filter(Boolean)
          )
        ]
      : [];

  product.img = String(
    incoming.img ||
    product.images[0] ||
    'assets/banner-sapucaia.png'
  );

  if (
    !product.images.includes(
      product.img
    )
  ) {
    product.images.unshift(
      product.img
    );
  }

  if (
    product.validityType === 'days'
  ) {
    product.valid =
      `${product.validityDays} dias`;
  } else if (
    product.validityType === 'wipe'
  ) {
    product.valid = 'Até o wipe';
  } else {
    product.valid = 'Permanente';
  }

  return product;
}

function safeFilename(name = '') {
  return String(name)
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 120);
}

function mimeFromFilename(name = '') {
  const ext = String(name)
    .toLowerCase()
    .split('.')
    .pop();

  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    avif: 'image/avif'
  };

  return map[ext] || 'application/octet-stream';
}

async function saveMedia(req) {
  const contentType =
    req.headers.get('content-type') || '';

  /*
   * Upload normal via FormData
   */
  if (
    contentType
      .toLowerCase()
      .includes('multipart/form-data')
  ) {
    const form = await req.formData();

    let file =
      form.get('file') ||
      form.get('image') ||
      form.get('banner');

    if (
      !file ||
      typeof file.arrayBuffer !== 'function'
    ) {
      return json(
        {
          error:
            'Nenhum arquivo foi enviado.'
        },
        400
      );
    }

    const originalName =
      safeFilename(
        file.name ||
        `upload-${Date.now()}`
      );

    const mime =
      file.type ||
      mimeFromFilename(
        originalName
      );

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    if (!buffer.length) {
      return json(
        {
          error:
            'O arquivo enviado está vazio.'
        },
        400
      );
    }

    /*
     * Limite de segurança: 15 MB.
     */
    if (
      buffer.length >
      15 * 1024 * 1024
    ) {
      return json(
        {
          error:
            'Arquivo muito grande. Máximo: 15 MB.'
        },
        413
      );
    }

    const id =
      `${Date.now()}-${crypto.randomUUID()}`;

    const key =
      `media/${id}-${originalName}`;

    await store(
      'sapucaia-media'
    ).set(
      key,
      buffer,
      {
        contentType: mime
      }
    );

    return json(
      {
        ok: true,
        id,
        key,
        name: originalName,
        type: mime,
        size: buffer.length,
        url:
          `/api/store?resource=media&id=${encodeURIComponent(key)}`
      },
      200
    );
  }

  /*
   * Também aceita JSON com base64.
   */
  if (
    contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    const body =
      await req.json().catch(
        () => ({})
      );

    const base64 = String(
      body.base64 ||
      body.data ||
      ''
    );

    if (!base64) {
      return json(
        {
          error:
            'Nenhuma imagem foi enviada.'
        },
        400
      );
    }

    const match =
      base64.match(
        /^data:([^;]+);base64,(.+)$/s
      );

    const mime =
      match?.[1] ||
      String(
        body.type ||
        'image/png'
      );

    const encoded =
      match?.[2] ||
      base64;

    const buffer =
      Buffer.from(
        encoded,
        'base64'
      );

    if (!buffer.length) {
      return json(
        {
          error:
            'Imagem inválida.'
        },
        400
      );
    }

    if (
      buffer.length >
      15 * 1024 * 1024
    ) {
      return json(
        {
          error:
            'Arquivo muito grande. Máximo: 15 MB.'
        },
        413
      );
    }

    const extension =
      mime.includes('jpeg')
        ? 'jpg'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('gif')
            ? 'gif'
            : 'png';

    const key =
      `media/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    await store(
      'sapucaia-media'
    ).set(
      key,
      buffer,
      {
        contentType: mime
      }
    );

    return json(
      {
        ok: true,
        id: key,
        key,
        type: mime,
        size: buffer.length,
        url:
          `/api/store?resource=media&id=${encodeURIComponent(key)}`
      },
      200
    );
  }

  return json(
    {
      error:
        'Formato de upload não suportado.'
    },
    415
  );
}

async function getMedia(req, key) {
  if (!key) {
    return json(
      {
        error:
          'Mídia não informada.'
      },
      400
    );
  }

  const blobStore =
    store('sapucaia-media');

  const result =
    await blobStore.get(
      key,
      {
        type: 'arrayBuffer',
        consistency: 'strong'
      }
    );

  if (!result) {
    return json(
      {
        error:
          'Mídia não encontrada.'
      },
      404
    );
  }

  let contentType =
    'application/octet-stream';

  const lower =
    key.toLowerCase();

  if (
    lower.endsWith('.png')
  ) {
    contentType =
      'image/png';
  } else if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  ) {
    contentType =
      'image/jpeg';
  } else if (
    lower.endsWith('.gif')
  ) {
    contentType =
      'image/gif';
  } else if (
    lower.endsWith('.webp')
  ) {
    contentType =
      'image/webp';
  } else if (
    lower.endsWith('.svg')
  ) {
    contentType =
      'image/svg+xml';
  } else if (
    lower.endsWith('.avif')
  ) {
    contentType =
      'image/avif';
  }

  return new Response(
    result,
    {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control':
          'public, max-age=31536000, immutable'
      }
    }
  );
}

export default async function handler(req) {
  try {
    const url =
      new URL(req.url);

    const resource =
      url.searchParams.get(
        'resource'
      ) || 'public';

    /*
     * ==========================
     * PUBLIC MEDIA
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'media'
    ) {
      const key =
        url.searchParams.get('id') ||
        url.searchParams.get('key');

      return getMedia(
        req,
        key
      );
    }

    /*
     * ==========================
     * PUBLIC
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'public'
    ) {
      const list =
        await products();

      return json(
        {
          products:
            Array.isArray(list)
              ? list.filter(
                  p =>
                    p &&
                    p.published === true
                )
              : [],

          settings:
            await getSettings()
        },
        200,
        {
          'cache-control':
            'no-store'
        }
      );
    }

    /*
     * ==========================
     * HEALTH
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'health'
    ) {
      return json({
        ok: true,
        service: 'store',
        time:
          new Date().toISOString()
      });
    }

    /*
     * Tudo abaixo exige admin.
     */

    if (!requireAdmin(req)) {
      return json(
        {
          error:
            'Não autorizado'
        },
        401
      );
    }

    /*
     * ==========================
     * GET PRODUCTS
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'products'
    ) {
      return json({
        products:
          await products()
      });
    }

    /*
     * ==========================
     * GET ORDERS
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'orders'
    ) {
      return json({
        orders:
          await orders()
      });
    }

    /*
     * ==========================
     * GET CUSTOMERS
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'customers'
    ) {
      return json({
        customers:
          await customers()
      });
    }

    /*
     * ==========================
     * GET SETTINGS
     * ==========================
     */

    if (
      req.method === 'GET' &&
      resource === 'settings-admin'
    ) {
      return json({
        settings:
          await getSettings()
      });
    }

    /*
     * ==========================
     * POST
     * ==========================
     */

    if (req.method !== 'POST') {
      return json(
        {
          error:
            'Método não permitido'
        },
        405
      );
    }

    /*
     * ==========================
     * MEDIA
     * ==========================
     */

    if (
      resource === 'media'
    ) {
      return saveMedia(req);
    }

    /*
     * ==========================
     * PRODUCTS
     * ==========================
     */

    if (
      resource === 'products'
    ) {
      const list =
        await products();

      const body =
        await req.json().catch(
          () => ({})
        );

      /*
       * SAVE
       */

      if (
        body.action === 'save'
      ) {
        const product =
          normalizeProduct(
            body.product || {}
          );

        if (
          !product.name ||
          !product.cat ||
          !Number.isFinite(
            product.price
          ) ||
          product.price <= 0
        ) {
          return json(
            {
              error:
                'Nome, categoria e preço são obrigatórios.'
            },
            400
          );
        }

        const index =
          list.findIndex(
            item =>
              String(item.id) ===
              product.id
          );

        if (index >= 0) {
          list[index] =
            product;
        } else {
          list.unshift(
            product
          );
        }

        await putJSON(
          'sapucaia-data',
          'products',
          list
        );

        const verified =
          await products();

        const saved =
          verified.find(
            item =>
              String(item.id) ===
              product.id
          );

        if (!saved) {
          return json(
            {
              error:
                'Falha ao confirmar publicação.'
            },
            500
          );
        }

        return json({
          ok: true,
          product: saved,
          products: verified
        });
      }

      /*
       * DELETE
       */

      if (
        body.action === 'delete'
      ) {
        const id =
          String(
            body.id || ''
          );

        const next =
          list.filter(
            item =>
              String(item.id) !==
              id
          );

        await putJSON(
          'sapucaia-data',
          'products',
          next
        );

        return json({
          ok: true,
          products:
            await products()
        });
      }

      return json(
        {
          error:
            'Ação de produto inválida.'
        },
        400
      );
    }

    /*
     * ==========================
     * SETTINGS
     * ==========================
     */

    if (
      resource === 'settings'
    ) {
      const current =
        await getSettings();

      const incoming =
        body.settings &&
        typeof body.settings ===
          'object'
          ? body.settings
          : {};

      const next = {
        ...current,
        ...incoming
      };

      await putJSON(
        'sapucaia-config',
        'settings',
        next
      );

      return json({
        ok: true,
        settings: next
      });
    }

    /*
     * ==========================
     * ORDERS
     * ==========================
     */

    if (
      resource === 'orders'
    ) {
      const list =
        await orders();

      if (
        body.action === 'status'
      ) {
        const order =
          list.find(
            item =>
              String(item.id) ===
              String(body.id)
          );

        if (!order) {
          return json(
            {
              error:
                'Pedido não encontrado'
            },
            404
          );
        }

        order.status =
          String(
            body.status ||
            order.status ||
            'Aguardando pagamento'
          );

        order.updatedAt =
          new Date().toISOString();

        await putJSON(
          'sapucaia-data',
          `order-${order.id}`,
          order
        );

        return json({
          ok: true,
          order
        });
      }
    }

    return json(
      {
        error:
          'Ação não encontrada'
      },
      400
    );

  } catch (error) {
    console.error(
      'SAPUCAIA STORE ERROR:',
      error
    );

    return json(
      {
        error:
          error?.message ||
          'Erro interno.'
      },
      500
    );
  }
}

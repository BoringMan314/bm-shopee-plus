/**
 * 蝦皮短網址轉換（保持原國家站，不跨區）
 *
 * 輸出格式：https://{區域主網域}/product/{shopId}/{itemId}
 * 例：shopee.tw → 仍為 shopee.tw，不會變成 sg / vn 等
 */

/** 區域主網域（由長到短，避免誤匹配） */
const REGION_HOSTS = [
  'shopee.com.my',
  'shopee.com.br',
  'shopee.co.th',
  'shopee.co.id',
  'shopee.com',
  'shopee.tw',
  'shopee.sg',
  'shopee.vn',
  'shopee.ph',
  'xiapibuy.com'
];

/**
 * 將 m.shopee.tw / www.shopee.tw 等正規成該國主網域。
 * 找不到對應區域則回傳 null（拒絕轉換，避免誤導向）。
 */
export function canonicalShopeeHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/\.$/, '');

  for (const region of REGION_HOSTS) {
    if (host === region || host.endsWith(`.${region}`)) {
      return region;
    }
  }
  return null;
}

/**
 * 從 pathname / search 取出 shopId、itemId
 */
export function extractProductIds(url) {
  const path = decodeURIComponent(url.pathname);

  const fromProduct = path.match(/\/product\/(\d+)\/(\d+)/i);
  if (fromProduct) {
    return { shopId: fromProduct[1], itemId: fromProduct[2] };
  }

  // SEO：...-i.{shopId}.{itemId} 或 /i.{shopId}.{itemId}
  const fromSeo = path.match(/(?:^|\/|-)i\.(\d+)\.(\d+)\/?$/i);
  if (fromSeo) {
    return { shopId: fromSeo[1], itemId: fromSeo[2] };
  }

  // 少數深連結帶 query
  const shopId =
    url.searchParams.get('shopid') ||
    url.searchParams.get('shop_id') ||
    url.searchParams.get('shopId');
  const itemId =
    url.searchParams.get('itemid') ||
    url.searchParams.get('item_id') ||
    url.searchParams.get('itemId');

  if (shopId && itemId && /^\d+$/.test(shopId) && /^\d+$/.test(itemId)) {
    return { shopId, itemId };
  }

  return null;
}

/**
 * 轉成乾淨分享連結；失敗回傳 null
 */
export function toShareLink(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = canonicalShopeeHost(url.hostname);
  if (!host) return null;

  const ids = extractProductIds(url);
  if (!ids) return null;

  // 固定 https + 區域主網域，去掉追蹤參數與子網域
  return `https://${host}/product/${ids.shopId}/${ids.itemId}`;
}

import { cookies } from "next/headers";
import { MOBILESHOP_GRAPHQL_API_ENDPOINT } from "../constants";
import { isMobileShopError } from "../type-guards";
import { ensureStartsWith } from "../utils";
import { Cart, Connection, MobileShopCart, MobileShopCartOperation } from "./type";
import { getCartQuery } from "./queries/cart";

const domain = process.env.MOBILESHOP_STORE_DOMAIN ? ensureStartsWith(process.env.MOBILESHOP_STORE_DOMAIN, 'https://') : '';
// const endpoint = `${domain}${MOBILESHOP_GRAPHQL_API_ENDPOINT}`
const endpoint = `https://unvjq7-zj.myshopify.com/`
const key = process.env.MOBILESHOP_STOREFRONT_ACCESS_TOKEN!;

type ExtractVariables<T> = T extends { variables: object }
  ? T["variables"]
  : never;

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map(edge => edge.node);
};

const reshapeCart = (cart: MobileShopCart): Cart => {
  if (!cart.cost?.totalAmount) {
    cart.cost.totalAmount = {
      amount: "0.0",
      currencyCode: cart.cost.totalAmount.currencyCode,
    };
  }
  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines),
  };
};

export async function mobileShopFetch<T>({
  headers,
  query,
  variables,
}: {
  headers?: HeadersInit;
  query: string;
  variables?: ExtractVariables<T>;
}): Promise<{ status: number; body: T }> {
  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': key,
        ...headers
      },
      body: JSON.stringify({
        ...(query && {query}),
        ...(variables && {variables})
      })
    });
    const body = await result.json();
console.log(body);

    if(body.error) {
      throw body.error[0];
    }

    return {
      status: result.status,
      body
    };

  } catch (e) {
    console.log(e);
    
    if (isMobileShopError(e)) {
      throw new Error(e.message.message, {
        cause: e.cause instanceof Error ? e.cause : undefined,
      });
    }
    
    throw new Error(e instanceof Error ? e.message : "Unknown error", {
      cause: e instanceof Error ? e : undefined,
    });
  }
}

export async function getCart(): Promise<Cart | undefined> {
  const cartId =  (await cookies()).get('cartid')?.value;
  console.log(cartId);
  if(!cartId) return undefined;
  const res = await mobileShopFetch<MobileShopCartOperation>({
    query: getCartQuery,
    variables: {cartId}
  });
  // Old carts becomes `null` when you checkout.
  if (!res.body.data.cart) {
    return undefined;
  }

  return reshapeCart(res.body.data.cart);
}

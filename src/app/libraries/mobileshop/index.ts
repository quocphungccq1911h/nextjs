import { MOBILESHOP_GRAPHQL_API_ENDPOINT } from "../constants";
import { isMobileShopError } from "../type-guards";
import { ensureStartsWith } from "../utils";
import { Cart, Connection, MobileShopCart } from "./type";

const domain = process.env.MOBILESHOP_STORE_DOMAIN ? ensureStartsWith(process.env.MOBILESHOP_STORE_DOMAIN, 'https://') : '';
const endpoint = `${domain}${MOBILESHOP_GRAPHQL_API_ENDPOINT}`
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
}): Promise<{ status: number; body: T } | never> {
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

    if(body.error) {
      throw body.error[0];
    }

    return {
      status: result.status,
      body
    };

  } catch (e) {
    if(isMobileShopError(e)) {
      
    }
  }
}

export async function getCart(): Promise<Cart | undefined> {}

#!/usr/bin/env node

/**
 * Creates SUVEDH's manual Shopify collections without changing existing ones.
 *
 * Required environment variables:
 *   SHOPIFY_STORE_DOMAIN=my-store.myshopify.com
 *   SHOPIFY_CLIENT_ID=...
 *   SHOPIFY_CLIENT_SECRET=...
 *
 * Requires Node.js 18+ (for the built-in fetch API).
 */

'use strict';

const COLLECTION_GROUPS = {
  Women: [
    'Rings',
    'Toe Rings',
    'Earrings',
    'Studs',
    'Hoops',
    'Bracelets',
    'Kadas',
    'Necklaces',
    'Charms',
    'Anklets',
  ],
  Men: ['Rings', 'Chains', 'Bracelets'],
  Kids: ['Nazaria', 'Anklets', 'Rings', 'Earrings', 'Charms', 'Hoops'],
};

const API_VERSION = '2026-07';

function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeStoreDomain(value) {
  const domain = value
    .replace(/^https?:\/\//i, '')
    
    .replace(/\/$/, '')
    .toLowerCase();

  if (domain === 'admin.shopify.com' || domain.startsWith('admin.shopify.com/')) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN cannot be an admin.shopify.com URL; use your .myshopify.com domain.',
    );
  }

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN must look like "your-store.myshopify.com".',
    );
  }

  return domain;
}

function toHandle(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function desiredCollections() {
  const collections = [];

  for (const [group, children] of Object.entries(COLLECTION_GROUPS)) {
    collections.push({ title: group, handle: toHandle(group) });

    for (const title of children) {
      // Collections are flat in Shopify. Scoped handles keep repeated display
      // titles (for example, Rings) distinct and make reruns deterministic.
      collections.push({
        title,
        handle: `${toHandle(group)}-${toHandle(title)}`,
      });
    }
  }

  return collections;
}

async function requestAccessToken(storeDomain, clientId, clientSecret) {
  const tokenEndpoint = 'https://' + storeDomain + '/admin/oauth/access_token';
  let response;

  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch (error) {
    throw new Error('Could not connect to Shopify for authentication: ' + error.message);
  }

  const bodyText = await response.text();
  const contentType = response.headers.get('content-type') || '(missing)';
  let body;

  try {
    body = JSON.parse(bodyText);
  } catch {
    const excerpt = bodyText.slice(0, 300).replaceAll(clientSecret, '[REDACTED]');
    throw new Error(
      'Shopify authentication failed (HTTP ' + response.status +
        '; content-type: ' + contentType + '): non-JSON response: ' +
        (excerpt || '(empty response)'),
    );
  }

  if (!response.ok) {
    const message = String(
      body.error_description || body.error || response.statusText || 'Unknown error',
    ).replaceAll(clientSecret, '[REDACTED]');
    throw new Error(
      'Shopify authentication failed (HTTP ' + response.status +
        '; content-type: ' + contentType + '): ' + message,
    );
  }

  if (typeof body.access_token !== 'string' || !body.access_token) {
    throw new Error('Shopify authentication succeeded but returned no access token.');
  }

  return body.access_token;
}
async function shopifyGraphQL(endpoint, accessToken, query, variables = {}) {
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new Error(`Could not connect to Shopify: ${error.message}`);
  }

  const bodyText = await response.text();
  let body;

  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(
      `Shopify returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const message = body.errors?.[0]?.message || response.statusText;
    throw new Error(`Shopify API request failed (HTTP ${response.status}): ${message}`);
  }

  if (body.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`,
    );
  }

  return body.data;
}

async function getExistingCollections(endpoint, accessToken) {
  const query = `
    query ExistingCollections($cursor: String) {
      collections(first: 250, after: $cursor) {
        nodes {
          id
          title
          handle
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const collections = [];
  let cursor = null;

  do {
    const data = await shopifyGraphQL(endpoint, accessToken, query, { cursor });
    collections.push(...data.collections.nodes);
    cursor = data.collections.pageInfo.hasNextPage
      ? data.collections.pageInfo.endCursor
      : null;
  } while (cursor);

  return collections;
}

async function createCollection(endpoint, accessToken, collection) {
  const mutation = `
    mutation CreateCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(endpoint, accessToken, mutation, {
    input: collection,
  });
  const result = data.collectionCreate;

  if (result.userErrors.length) {
    const details = result.userErrors
      .map(({ field, message }) => `${field?.join('.') || 'collection'}: ${message}`)
      .join('; ');
    throw new Error(`Could not create "${collection.title}" (${collection.handle}): ${details}`);
  }

  if (!result.collection) {
    throw new Error(
      `Could not create "${collection.title}" (${collection.handle}): Shopify returned no collection.`,
    );
  }

  return result.collection;
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('This script requires Node.js 18 or newer.');
  }

  const storeDomain = normalizeStoreDomain(
    requireEnvironmentVariable('SHOPIFY_STORE_DOMAIN'),
  );
  const clientId = requireEnvironmentVariable('SHOPIFY_CLIENT_ID');
  const clientSecret = requireEnvironmentVariable('SHOPIFY_CLIENT_SECRET');
  const accessToken = await requestAccessToken(storeDomain, clientId, clientSecret);
  const endpoint = `https://${storeDomain}/admin/api/${API_VERSION}/graphql.json`;

  const existingCollections = await getExistingCollections(endpoint, accessToken);
  const existingHandles = new Set(
    existingCollections.map(({ handle }) => handle.toLowerCase()),
  );

  for (const collection of desiredCollections()) {
    if (existingHandles.has(collection.handle)) {
      console.log(
        `SKIPPED: "${collection.title}" already exists (handle: ${collection.handle}).`,
      );
      continue;
    }

    const created = await createCollection(endpoint, accessToken, collection);
    existingHandles.add(created.handle.toLowerCase());
    console.log(
      `CREATED: "${created.title}" (handle: ${created.handle}, id: ${created.id}).`,
    );
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

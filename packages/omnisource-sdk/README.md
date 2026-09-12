# @omnistore/omnisource-sdk

Framework-neutral TypeScript client for the OmniSource-Pro API v1 contract.

```ts
import { OmniSourceApiClient } from "@omnistore/omnisource-sdk";

const source = new OmniSourceApiClient("https://source.example/api/v1");
const { items } = await source.getApps({ sort: "popularity", perPage: 24 });
const app = await source.getApp("app-slug");
const categories = await source.getCategories();
const trending = await source.getTrending();
const collections = await source.getCollections();
const stats = await source.getStats();
const recommendations = app ? await source.getRecommendations(app.id) : null;
```

Responses are validated against `@omnistore/shared-models` Zod schemas before
mapping to domain models. The Next.js adapter in `src/lib/omnisource` adds ISR
tags, retries, and the local development snapshot without changing the public
SDK surface.

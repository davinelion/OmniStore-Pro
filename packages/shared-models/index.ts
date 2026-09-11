/**
 * @omnistore/shared-models
 *
 * Single source of truth for every OmniStore client (web today; iOS, Android
 * and desktop tomorrow). Contains types, wire DTOs, zod schemas and validators
 * for the OmniSource REST API v1 contract.
 *
 * Rules:
 * - No client lives here — models only.
 * - Never derive these types from a client implementation; clients derive
 *   their behaviour from these models.
 * - `null` means "OmniSource has no data" — never substitute invented values.
 */

export * from "./src/api/common";
export * from "./src/models/app";
export * from "./src/models/developer";
export * from "./src/models/category";
export * from "./src/models/collection";
export * from "./src/models/trust";
export * from "./src/models/security";
export * from "./src/models/recommendation";
export * from "./src/models/search";
export * from "./src/models/stats";
export * from "./src/models/analytics";
export * from "./src/dto/omnisource";
export * from "./src/schemas/app";
export * from "./src/schemas/common";
export * from "./src/schemas/taxonomy";
export * from "./src/schemas/experience";
export * from "./src/schemas/intelligence";
export * from "./src/validators";

// The client imports the Worker's router type (for type-safe tRPC calls) but
// is compiled with DOM types, not Cloudflare's. These stand-ins cover the
// Cloudflare binding types the Worker files mention. The Worker itself is
// type checked separately with the real types (worker/tsconfig.json).
type D1Database = any;
type R2Bucket = any;
type Fetcher = any;
type ExecutionContext = any;
interface CacheStorage { readonly default: Cache }

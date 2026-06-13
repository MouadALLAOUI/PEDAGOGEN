declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, "UserId">;
export type GenerationId = Brand<string, "GenerationId">;
export type ReferenceId = Brand<string, "ReferenceId">;

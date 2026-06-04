export type AsyncHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

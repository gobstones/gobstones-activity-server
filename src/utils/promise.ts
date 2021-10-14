interface PromisesObj {
  [index: string]: Promise<any>;
}

/**
 * This function maps `{a: somePromise}` to a promise that
 * resolves with `{a: resolvedValue}`.
 */
export function promiseProps(obj: PromisesObj): Promise<any> {
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  return Promise.all(values).then((resolved) => {
    const res = {};
    for (let i = 0; i < keys.length; i += 1) {
      res[keys[i]] = resolved[i];
    }
    return res;
  });
}

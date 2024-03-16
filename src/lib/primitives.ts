export const guarded = <T, U extends T>(data: T, predicate: (input: NonNullable<T>) => U | false) => {
  const guard = (value: T): value is U => value && predicate(value) !== false
  if (guard(data)) return data
  return null
}

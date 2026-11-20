// The database hands back at most 1,000 rows per request. Totals built from
// rows (hours served, amount given, open spots) would quietly stop counting
// past that, so this keeps asking a page at a time until it has them all.
const PAGE = 1000

export async function allRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  maxPages = 20
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; page < maxPages; page++) {
    const { data } = await fetchPage(page * PAGE, page * PAGE + PAGE - 1)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

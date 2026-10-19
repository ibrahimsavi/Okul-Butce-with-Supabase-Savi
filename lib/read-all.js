// Use a fresh, deterministically ordered query for each page. Advance by actual
// rows returned so a lower PostgREST max_rows setting cannot truncate exports.
async function readAll(createQuery) {
  const rows = [];
  for (;;) {
    const { data, error } = await createQuery().range(rows.length, rows.length + 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid database response');
    if (!data.length) return rows;
    rows.push(...data);
  }
}
module.exports = { readAll };

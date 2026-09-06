export async function putChunk(bucket: R2Bucket, key: string, chunk: ArrayBuffer, index: number, total: number) {
  // Store each chunk temporarily as key.part.index
  const partKey = `${key}.part.${index}`
  await bucket.put(partKey, chunk)
  // If last chunk, assemble? For simplicity we assemble on finalize by concatenating
  return partKey
}
export async function assembleFile(bucket: R2Bucket, baseKey: string, total: number): Promise<void> {
  // In production, use R2 multipart via compose if available, here we concat via reading parts
  const parts: Uint8Array[] = []
  for (let i=0;i<total;i++) {
    const obj = await bucket.get(`${baseKey}.part.${i}`)
    if (!obj) throw new Error(`Missing part ${i}`)
    parts.push(new Uint8Array(await obj.arrayBuffer()))
    await bucket.delete(`${baseKey}.part.${i}`)
  }
  const totalLen = parts.reduce((a,b)=>a+b.length,0)
  const merged = new Uint8Array(totalLen)
  let offset=0
  for (const p of parts) { merged.set(p, offset); offset+=p.length }
  await bucket.put(baseKey, merged)
}
export async function streamFromR2(bucket: R2Bucket, key: string) {
  const obj = await bucket.get(key)
  if (!obj) return null
  return obj
}

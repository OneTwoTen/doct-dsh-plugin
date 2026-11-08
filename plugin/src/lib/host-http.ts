/**
 * Helpers every Host Fetch route needs: read a JSON payload and answer one JSON
 * envelope.
 *
 * The Git routes and the Web Remote card share one wire shape, so both read and
 * write it through here rather than keeping two copies of the same code.
 */

/**
 * Read one route's JSON request payload.
 * @param request the Fetch request the shared channel admitted.
 * @returns the payload, or undefined when the body is not JSON.
 */
export async function readJsonPayload(request: Request): Promise<Record<string, unknown> | undefined> {
  let text: string
  try {
    text = await request.text()
  } catch {
    return undefined
  }
  if (text.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

/**
 * Answer one route call as JSON the browser reads directly.
 * @param body response envelope.
 */
export function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

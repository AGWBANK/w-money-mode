export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (password !== process.env.MODEL_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' })
  }

  // Set secure httpOnly cookie
  res.setHeader('Set-Cookie', [
    `wm_auth=${process.env.AUTH_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
  ])

  return res.status(200).json({ ok: true })
}

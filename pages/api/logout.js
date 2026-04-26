export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'wm_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  ])
  res.redirect(302, '/login')
}

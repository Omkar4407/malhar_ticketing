import { signToken, verifyToken } from "../services/jwt.service.js";

export async function adminLogin(req, res) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required." });
  if (password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "Incorrect password." });
  return res.json({ success: true, token: signToken({ role: "super_admin" }) });
}

export async function scannerLogin(req, res) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required." });
  if (password !== process.env.SCANNER_PASSWORD)
    return res.status(401).json({ error: "Incorrect password." });
  return res.json({ success: true, token: signToken({ role: "scanner" }) });
}

export async function verifyTokenHandler(req, res) {
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false });
  try {
    const payload = verifyToken(token);
    return res.json({ valid: true, payload });
  } catch {
    return res.status(401).json({ valid: false });
  }
}
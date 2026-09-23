import { authService } from "../services/authService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ ok: false, message: "Name is required", status: 400 });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ ok: false, message: "A valid email address is required", status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Password must be at least 6 characters long",
        status: 400
      });
    }

    const { token, user } = await authService.registerUser({
      name: name.trim(),
      email: email.trim(),
      password
    });

    return res.status(201).json({
      ok: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email and password are required",
        status: 400
      });
    }

    const { token, user } = await authService.loginUser({
      email: email.trim(),
      password
    });

    return res.json({
      ok: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}


export function getMe(req, res) {
  return res.json({
    ok: true,
    user: req.user
  });
}

import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  const { user, token } = await authService.registerUser({
    name,
    email,
    password,
    role,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: { user, token },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user, token },
  });
};

export const getMe = async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
};

export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

import * as authService from '../services/auth.service.js';
export const handleRegister = async (req, res) => {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const newUser = await authService.registerUser({ fullName, email, password, role });
    res.status(201).json(newUser);
};
export const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });
    }
    const result = await authService.loginUser(email, password);
    res.json(result);
};

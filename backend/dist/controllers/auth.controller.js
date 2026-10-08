import * as authService from '../services/auth.service.js';
export const handleRegister = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        const newUser = await authService.registerUser({ fullName, email, password, role });
        res.status(201).json(newUser);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al registrar usuario' });
    }
};
export const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }
        const result = await authService.loginUser(email, password);
        res.json(result);
    }
    catch (error) {
        res.status(401).json({ error: error.message || 'Credenciales inválidas' });
    }
};

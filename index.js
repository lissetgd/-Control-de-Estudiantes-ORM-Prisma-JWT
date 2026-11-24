const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'clave_secreta_super_segura';

function serializarFilas(filas) {
    return JSON.parse(
        JSON.stringify(filas, (_, value) =>
            typeof value === 'bigint' ? Number(value) : value
        )
    );
}

// --- MIDDLEWARES DE AUTENTICACIÓN Y ROLES ---
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
}

function esAdministrador(req, res, next) {
    if (req.user.rol !== 'ADMINISTRADOR') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
    next();
}

// --- 1. REGISTRO Y LOGIN ---
app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, email, password, rol, fechaNac } = req.body;
        if (!email || !password || !rol) {
            return res.status(400).json({ error: 'Correo, contraseña y rol son obligatorios.' });
        }

        const existe = await prisma.usuario.findUnique({ where: { email } });
        if (existe) return res.status(400).json({ error: 'Ese correo ya está registrado.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (rol === 'ADMINISTRADOR') {
            const admin = await prisma.usuario.create({
                data: {
                    email,
                    password: hashedPassword,
                    rol: 'ADMINISTRADOR'
                }
            });
            return res.status(201).json({ mensaje: 'Administrador registrado con éxito', id: admin.id });
        } else {
            const estudiante = await prisma.estudiante.create({
                data: {
                    nombre: nombre || email.split('@')[0],
                    email,
                    fechaNac: fechaNac ? new Date(fechaNac) : null,
                    usuario: {
                        create: {
                            email,
                            password: hashedPassword,
                            rol: 'ESTUDIANTE'
                        }
                    }
                }
            });
            return res.status(201).json({ mensaje: 'Estudiante registrado con éxito', id: estudiante.id });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            SECRET_KEY,
            { expiresIn: '8h' }
        );
        res.json({ mensaje: 'Login exitoso', token, rol: usuario.rol, email: usuario.email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 2. RUTAS DE ADMINISTRADOR ---
app.post('/api/estudiantes', verificarToken, esAdministrador, async (req, res) => {
    try {
        const { nombre, email, password, fechaNac } = req.body;
        const hashedPassword = await bcrypt.hash(password || '123456', 10);

        const nuevoEstudiante = await prisma.estudiante.create({
            data: {
                nombre,
                email,
                fechaNac: fechaNac ? new Date(fechaNac) : null,
                usuario: {
                    create: {
                        email,
                        password: hashedPassword,
                        rol: 'ESTUDIANTE'
                    }
                }
            },
            include: { usuario: true }
        });
        res.status(201).json(nuevoEstudiante);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/cursos', verificarToken, esAdministrador, async (req, res) => {
    try {
        const { nombre, creditos } = req.body;
        const curso = await prisma.curso.create({
            data: { nombre, creditos: Number(creditos) || 5 }
        });
        res.status(201).json(curso);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/inscripciones', verificarToken, esAdministrador, async (req, res) => {
    try {
        const { estudianteId, cursoId } = req.body;
        const inscripcion = await prisma.inscripcion.create({
            data: { estudianteId: Number(estudianteId), cursoId: Number(cursoId) }
        });
        res.status(201).json(inscripcion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/calificaciones', verificarToken, esAdministrador, async (req, res) => {
    try {
        const { inscripcionId, parcial, calificacion } = req.body;
        const nuevaCal = await prisma.calificacion.create({
            data: {
                inscripcionId: Number(inscripcionId),
                parcial: Number(parcial),
                calificacion: Number(calificacion)
            }
        });
        res.status(201).json(nuevaCal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/estudiantes/:id', verificarToken, esAdministrador, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const est = await prisma.estudiante.findUnique({ where: { id } });
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        await prisma.estudiante.delete({ where: { id } });
        if (est.usuarioId) {
            await prisma.usuario.delete({ where: { id: est.usuarioId } }).catch(() => {});
        }
        res.json({ mensaje: `Estudiante con ID ${id} dado de baja correctamente.` });
    } catch (error) {
        res.status(400).json({ error: 'No se pudo eliminar: ' + error.message });
    }
});

app.get('/api/admin/consulta/:tipo', verificarToken, esAdministrador, async (req, res) => {
    try {
        const { tipo } = req.params;
        let filas = [];

        if (tipo === 'estudiantes') {
            filas = await prisma.estudiante.findMany({ orderBy: { id: 'asc' } });
        } else if (tipo === 'cursos') {
            filas = await prisma.curso.findMany({ orderBy: { id: 'asc' } });
        } else if (tipo === 'inscripciones') {
            filas = await prisma.$queryRawUnsafe(`
                SELECT i.id AS inscripcion_id, e.id AS estudiante_id, e.nombre AS estudiante, c.nombre AS curso
                FROM inscripciones i
                JOIN estudiantes e ON e.id = i.estudiante_id
                JOIN cursos c ON c.id = i.curso_id
                ORDER BY i.id ASC
            `);
        } else if (tipo === 'promedios') {
            filas = await prisma.$queryRawUnsafe(`SELECT * FROM vista_promedio_estudiante`);
        } else if (tipo === 'cursos-inscritos') {
            filas = await prisma.$queryRawUnsafe(`SELECT * FROM vista_cursos_inscritos`);
        } else if (tipo === 'boleta-detallada') {
            filas = await prisma.$queryRawUnsafe(`SELECT * FROM vista_boleta_estudiante`);
        } else if (tipo === 'reprobados') {
            filas = await prisma.$queryRawUnsafe(`SELECT * FROM vista_reprobados`);
        } else {
            return res.status(400).json({ error: 'Tipo de consulta no válido' });
        }

        res.json(serializarFilas(filas));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 3. RUTAS PARA ESTUDIANTE ---
app.get('/api/mi-boleta', verificarToken, async (req, res) => {
    try {
        const estudiante = await prisma.estudiante.findUnique({
            where: { usuarioId: req.user.id },
            include: {
                inscripciones: {
                    include: {
                        curso: true,
                        calificaciones: true
                    }
                }
            }
        });

        if (!estudiante) return res.status(404).json({ error: 'Perfil de estudiante no encontrado' });
        res.json(serializarFilas(estudiante));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
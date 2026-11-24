CREATE OR REPLACE VIEW vista_promedio_estudiante AS
SELECT 
    e.id AS estudiante_id,
    e.nombre,
    e.email,
    ROUND(AVG(c.calificacion), 2) AS promedio_general,
    COUNT(c.id) AS total_evaluaciones
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
JOIN calificaciones c ON c.inscripcion_id = i.id
GROUP BY e.id, e.nombre, e.email;

CREATE OR REPLACE VIEW vista_cursos_inscritos AS
SELECT 
    cu.id AS curso_id,
    cu.nombre AS curso,
    cu.creditos,
    COUNT(DISTINCT i.estudiante_id) AS estudiantes_inscritos
FROM cursos cu
LEFT JOIN inscripciones i ON i.curso_id = cu.id
GROUP BY cu.id, cu.nombre, cu.creditos;

CREATE OR REPLACE VIEW vista_boleta_estudiante AS
SELECT 
    e.nombre AS estudiante,
    cu.nombre AS curso,
    c.parcial,
    c.calificacion
FROM calificaciones c
JOIN inscripciones i ON i.id = c.inscripcion_id
JOIN estudiantes e ON e.id = i.estudiante_id
JOIN cursos cu ON cu.id = i.curso_id
ORDER BY e.nombre, cu.nombre, c.parcial;

CREATE OR REPLACE VIEW vista_reprobados AS
SELECT 
    e.nombre AS estudiante,
    cu.nombre AS curso,
    ROUND(AVG(c.calificacion), 2) AS promedio
FROM estudiantes e
JOIN inscripciones i ON i.estudiante_id = e.id
JOIN cursos cu ON cu.id = i.curso_id
JOIN calificaciones c ON c.inscripcion_id = i.id
GROUP BY e.id, e.nombre, cu.id, cu.nombre
HAVING AVG(c.calificacion) < 6.0;
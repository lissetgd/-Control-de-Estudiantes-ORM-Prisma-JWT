import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

VISTAS_PERMITIDAS = {
    "vista_promedio_estudiante",
    "vista_cursos_inscritos",
    "vista_boleta_estudiante",
    "vista_reprobados",
}


def conectar():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def insertar_estudiante(nombre, email, fecha_nac=None):
    with conectar() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO estudiantes (nombre, email, fecha_nac)
                VALUES (%s, %s, %s)
                RETURNING id, nombre, email;
                """,
                (nombre, email, fecha_nac),
            )
            return cur.fetchone()


def inscribir(estudiante_id, curso_id):
    with conectar() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO inscripciones (estudiante_id, curso_id)
                VALUES (%s, %s)
                ON CONFLICT (estudiante_id, curso_id) DO NOTHING
                RETURNING id;
                """,
                (estudiante_id, curso_id),
            )
            return cur.fetchone()


def registrar_calificacion(inscripcion_id, parcial, calificacion):
    with conectar() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calificaciones (inscripcion_id, parcial, calificacion)
                VALUES (%s, %s, %s)
                RETURNING id, parcial, calificacion;
                """,
                (inscripcion_id, parcial, calificacion),
            )
            return cur.fetchone()


def consultar_vista(nombre_vista):
    if nombre_vista not in VISTAS_PERMITIDAS:
        raise ValueError("Vista no permitida")

    with conectar() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM {nombre_vista};")
            return cur.fetchall()


def menu():
    while True:
        print("\n=== ESCUELA ITP CONECTA ===")
        print("1. Registrar estudiante")
        print("2. Inscribir estudiante")
        print("3. Registrar calificación")
        print("4. Promedio por estudiante")
        print("5. Cursos e inscritos")
        print("6. Boleta detallada")
        print("7. Reprobados")
        print("8. Salir")

        opcion = input("Opción: ")

        try:
            if opcion == "1":
                nombre = input("Nombre: ")
                email = input("Email: ")
                fecha = input("Fecha nacimiento YYYY-MM-DD (opcional): ") or None
                print(insertar_estudiante(nombre, email, fecha))

            elif opcion == "2":
                estudiante_id = int(input("ID estudiante: "))
                curso_id = int(input("ID curso: "))
                print(inscribir(estudiante_id, curso_id))

            elif opcion == "3":
                inscripcion_id = int(input("ID inscripción: "))
                parcial = int(input("Parcial: "))
                calificacion = float(input("Calificación: "))
                print(registrar_calificacion(inscripcion_id, parcial, calificacion))

            elif opcion == "4":
                for fila in consultar_vista("vista_promedio_estudiante"):
                    print(fila)

            elif opcion == "5":
                for fila in consultar_vista("vista_cursos_inscritos"):
                    print(fila)

            elif opcion == "6":
                for fila in consultar_vista("vista_boleta_estudiante"):
                    print(fila)

            elif opcion == "7":
                for fila in consultar_vista("vista_reprobados"):
                    print(fila)

            elif opcion == "8":
                print("Práctica finalizada.")
                break

        except Exception as error:
            print("Error:", error)


if __name__ == "__main__":
    menu()

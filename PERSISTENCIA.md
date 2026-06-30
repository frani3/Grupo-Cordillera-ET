# Persistencia de Datos — Grupo Cordillera EP3
# DSY1106 Desarrollo Fullstack III

## Estrategia de persistencia

El sistema implementa dos estrategias de persistencia de forma
intencional para demostrar diferentes enfoques según el dominio:

---

## Estrategia 1: JPA + H2 en archivo (MS3, MS4, MS5, MS-Auth, ORQs)

### Tecnologías
- Spring Data JPA (ORM para Java)
- H2 Database en modo archivo (BD persiste entre reinicios)
- Volúmenes Docker para persistencia del archivo H2

### Dependencias (pom.xml)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Configuración (application.properties)
```properties
spring.datasource.url=jdbc:h2:file:/data/bd-inventario;DB_CLOSE_DELAY=-1;AUTO_RECONNECT=TRUE
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true
```

### Ejemplo de entidad JPA (MS3 Inventario)
```java
@Entity
@Table(name = "item_inventario")
public class ItemInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String itemId;

    @Column(nullable = false)
    private String nombre;

    @Column
    private String categoria;

    @Column
    private Integer cantidad;

    @Column
    private Long precioUnitario;

    @Column
    private String sucursal;

    @Column
    private LocalDate fecha;
}
```

### Repositorio JPA (MS3 Inventario)
```java
@Repository
public interface InventarioRepository
        extends JpaRepository<ItemInventario, Long> {

    List<ItemInventario> findBySucursal(String sucursal);
    List<ItemInventario> findByCategoria(String categoria);
    List<ItemInventario> findBySucursalAndCategoria(
        String sucursal, String categoria);
}
```

JpaRepository provee sin código adicional:
- `save(entity)`    → INSERT o UPDATE
- `findAll()`       → SELECT *
- `findById(id)`    → SELECT WHERE id
- `delete(entity)`  → DELETE
- `count()`         → COUNT(*)

### Bases de datos por servicio

| Servicio       | Base de datos H2       | Volumen Docker     | Consola H2                           |
|----------------|------------------------|--------------------|--------------------------------------|
| MS-Auth        | /data/bd-usuarios      | auth-data          | http://localhost:8090/h2-console     |
| MS3 Inventario | /data/bd-inventario    | inventario-data    | http://localhost:8084/h2-console     |
| MS4 Empleados  | /data/bd-empleados     | empleados-data     | http://localhost:8085/h2-console     |
| MS5 Reportes   | /data/bd-reportes      | reportes-data      | http://localhost:8086/h2-console     |
| ORQ Datos      | /data/bd-datos         | datos-db-data      | http://localhost:8082/h2-console     |
| ORQ Ind        | /data/bd-ind           | ind-db-data        | http://localhost:8092/h2-console     |
| ORQ Rep        | /data/bd-rep           | rep-db-data        | http://localhost:8093/h2-console     |

### Persistencia entre reinicios Docker

Los volúmenes Docker mapean `/data` del contenedor a un volumen
nombrado en el host. Al reiniciar, H2 lee el archivo existente:

```yaml
# docker-compose.yml (fragmento)
ms3-inventario:
  volumes:
    - inventario-data:/data

volumes:
  inventario-data:
```

`DB_CLOSE_DELAY=-1` mantiene la BD abierta mientras la JVM esté viva.
`ddl-auto=update` crea tablas si no existen y agrega columnas nuevas
sin borrar datos. Solo `docker-compose down -v` elimina los volúmenes.

---

## Estrategia 2: Singleton en Memoria (MS1-POS, MS2-Online)

### Por qué sin JPA

MS1 y MS2 modelan el canal de ventas en tiempo real.
Los datos son volátiles por diseño — representan transacciones
del flujo actual que son consolidadas por ORQ-DATOS con JPA.

### Implementación: Holder Pattern (variante thread-safe del Singleton)

```java
// MS1 — PosTransactionRepository
private static class DatabaseHolder {
    static final List<PosTransaction> INSTANCE =
        new CopyOnWriteArrayList<>();
}

public List<PosTransaction> findAll() {
    return new ArrayList<>(DatabaseHolder.INSTANCE);
}

public PosTransaction save(PosTransaction t) {
    DatabaseHolder.INSTANCE.add(t);
    return t;
}
```

`CopyOnWriteArrayList` garantiza thread-safety en lecturas
concurrentes sin bloqueos explícitos — múltiples simuladores
pueden escribir simultáneamente sin condiciones de carrera.

---

## Flujo completo de persistencia

```
Simulador → POST MS3 → InventarioController
              → validar campos obligatorios
              → InventarioRepository.save(item)
                → JPA → H2 (archivo /data/bd-inventario)
                          → Volumen Docker inventario-data
                              → Persiste entre reinicios ✓

Simulador → POST MS1 → PosController
              → posProcessingService.procesarYGuardar(dto)
                → PosTransactionRepository.save(t)
                  → CopyOnWriteArrayList (RAM)
                    → Se pierde al reiniciar (intencional)
```

---

## Contraste intencional

| Aspecto          | MS1 / MS2 (Singleton)           | MS3 / MS4 / MS5 (JPA + H2)              |
|------------------|---------------------------------|------------------------------------------|
| Persistencia     | En memoria; se pierde al reiniciar | En archivo; sobrevive reinicios       |
| Patrón de acceso | `getDatabase()` estático        | `JpaRepository<T, Long>`                |
| Thread safety    | `CopyOnWriteArrayList`          | Garantizada por JPA/Hibernate            |
| Uso              | Datos transaccionales "hot"     | Datos operacionales que deben persistir  |

package com.evaluacion.ms4.repository;

import com.evaluacion.ms4.model.RegistroEmpleado;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class EmpleadoRepository {

    private static final class Holder {
        static final EmpleadoRepository INSTANCE = new EmpleadoRepository();
    }

    private final List<RegistroEmpleado> registros = new CopyOnWriteArrayList<>();
    private final AtomicLong idSeq = new AtomicLong(1);

    private EmpleadoRepository() {}

    public static EmpleadoRepository getInstance() {
        return Holder.INSTANCE;
    }

    public RegistroEmpleado save(RegistroEmpleado r) {
        r.setId(idSeq.getAndIncrement());
        registros.add(r);
        return r;
    }

    public List<RegistroEmpleado> findAll() {
        return List.copyOf(registros);
    }

    public int count() {
        return registros.size();
    }
}
